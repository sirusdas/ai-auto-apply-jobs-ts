import React, { useState, useEffect, useRef } from 'react';

const SearchTimerConfig: React.FC = () => {
  const [jobConfigs, setJobConfigs] = useState<Array<{
    id: string;
    jobTitleName: string;
    jobConfigTimer: string;
    sequence: string;
    locations: Array<{
      id: string;
      locationName: string;
      locationTimer: string;
    }>;
    jobTypes: Array<{
      id: string;
      jobTypeName: string;
      jobTypeTimer: string;
    }>;
    workplaceTypes: Array<{
      id: string;
      workplaceTypeName: string;
      workplaceTypeTimer: string;
    }>;
  }>>([]);

  const [runInLoop, setRunInLoop] = useState<boolean>(false);

  const jsonEditorRef = useRef<HTMLDivElement>(null);
  const jsonEditorInstance = useRef<any>(null);
  const [isJsonEditing, setIsJsonEditing] = useState(false);

  useEffect(() => {
    // Load saved job configurations
    chrome.storage.local.get(['jobConfigs', 'runInLoop'], (result) => {
      if (result.jobConfigs) {
        setJobConfigs(restoreIds(result.jobConfigs));
      } else {
        // Initialize with one empty job config
        setJobConfigs([{
          id: `job-${Date.now()}`,
          jobTitleName: '',
          jobConfigTimer: '0',
          sequence: '',
          locations: [{
            id: `loc-${Date.now()}`,
            locationName: '',
            locationTimer: '0'
          }],
          jobTypes: [{
            id: `type-${Date.now()}`,
            jobTypeName: '',
            jobTypeTimer: '0'
          }],
          workplaceTypes: [{
            id: `wplace-${Date.now()}`,
            workplaceTypeName: '',
            workplaceTypeTimer: '0'
          }]
        }]);
      }

      if (result.runInLoop !== undefined) {
        setRunInLoop(result.runInLoop);
      }
    });
  }, []);

  useEffect(() => {
    // Initialize JSON editor when jobConfigs change
    if (jsonEditorRef.current) {
      try {
        // Clean up existing editor if it exists
        if (jsonEditorInstance.current) {
          jsonEditorInstance.current.destroy();
        }

        // Create a simple textarea-based JSON editor
        jsonEditorRef.current.innerHTML = '';
        const textarea = document.createElement('textarea');
        textarea.value = JSON.stringify(stripIds(jobConfigs), null, 2);
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '14px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.backgroundColor = '#f8f9fa';
        textarea.readOnly = !isJsonEditing; // Make editable when in editing mode
        jsonEditorRef.current.appendChild(textarea);

        // Add button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';

        if (!isJsonEditing) {
          const editButton = document.createElement('button');
          editButton.textContent = 'Edit JSON';
          editButton.className = 'btn btn-secondary';
          editButton.type = 'button';
          editButton.onclick = () => setIsJsonEditing(true);
          buttonContainer.appendChild(editButton);
        } else {
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save JSON';
          saveButton.className = 'btn btn-primary';
          saveButton.type = 'button';
          saveButton.style.marginRight = '10px';
          saveButton.onclick = handleJsonSave;
          buttonContainer.appendChild(saveButton);

          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.className = 'btn btn-danger';
          cancelButton.type = 'button';
          cancelButton.onclick = () => setIsJsonEditing(false);
          buttonContainer.appendChild(cancelButton);
        }

        jsonEditorRef.current.appendChild(buttonContainer);
      } catch (e) {
        console.error('Error initializing JSON editor:', e);
      }
    }

    // Initialize accordions after the component is rendered
    setTimeout(() => {
      if (typeof (window as any).initSearchTimerAccordions === 'function') {
        (window as any).initSearchTimerAccordions();
      }
    }, 0);
  }, [jobConfigs, isJsonEditing]);

  useEffect(() => {
    // Initialize accordions when component mounts
    if (typeof (window as any).initSearchTimerAccordions === 'function') {
      (window as any).initSearchTimerAccordions();
    }
  }, []);

  const stripIds = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(stripIds);
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {};
      for (const key in obj) {
        if (key !== 'id') {
          newObj[key] = stripIds(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  };

  const restoreIds = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(restoreIds);
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = { ...obj };
      if (!newObj.id) {
        // Generate a localized prefix based on common children
        let prefix = 'item';
        if (newObj.jobTitleName !== undefined) prefix = 'job';
        if (newObj.locationName !== undefined) prefix = 'loc';
        if (newObj.jobTypeName !== undefined) prefix = 'type';
        if (newObj.workplaceTypeName !== undefined) prefix = 'wplace';

        newObj.id = `${prefix}-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
      }
      for (const key in newObj) {
        if (Array.isArray(newObj[key])) {
          newObj[key] = restoreIds(newObj[key]);
        }
      }
      return newObj;
    }
    return obj;
  };

  const performFullSave = (configsToSave: any[]) => {
    // 1. Calculate effective timers (Bottom-up)
    const processedConfigs = configsToSave.map(job => {
      const hasLocations = job.locations && job.locations.some((l: any) => l.locationName || l.locationTimer);
      const hasJobTypes = job.jobTypes && job.jobTypes.some((jt: any) => jt.jobTypeName || jt.jobTypeTimer);
      const hasWorkplaceTypes = job.workplaceTypes && job.workplaceTypes.some((wt: any) => wt.workplaceTypeName || wt.workplaceTypeTimer);

      const updatedJob = { ...job };

      updatedJob.jobTypes = (job.jobTypes || []).map((jt: any) => {
        if (hasLocations) {
          const sum = job.locations.reduce((acc: number, loc: any) => acc + (parseFloat(loc.locationTimer) || 0), 0);
          return { ...jt, jobTypeTimer: sum.toString() };
        }
        return jt;
      });

      updatedJob.workplaceTypes = (job.workplaceTypes || []).map((wt: any) => {
        if (hasJobTypes) {
          const sum = updatedJob.jobTypes.reduce((acc: number, jt: any) => acc + (parseFloat(jt.jobTypeTimer) || 0), 0);
          return { ...wt, workplaceTypeTimer: sum.toString() };
        } else if (hasLocations) {
          const sum = job.locations.reduce((acc: number, loc: any) => acc + (parseFloat(loc.locationTimer) || 0), 0);
          return { ...wt, workplaceTypeTimer: sum.toString() };
        }
        return wt;
      });

      if (hasWorkplaceTypes) {
        updatedJob.jobConfigTimer = updatedJob.workplaceTypes.reduce((acc: number, wt: any) => acc + (parseFloat(wt.workplaceTypeTimer) || 0), 0).toString();
      } else if (hasJobTypes) {
        updatedJob.jobConfigTimer = updatedJob.jobTypes.reduce((acc: number, jt: any) => acc + (parseFloat(jt.jobTypeTimer) || 0), 0).toString();
      } else if (hasLocations) {
        updatedJob.jobConfigTimer = job.locations.reduce((acc: number, loc: any) => acc + (parseFloat(loc.locationTimer) || 0), 0).toString();
      }

      return updatedJob;
    });

    // 2. Validation
    const isValid = processedConfigs.length > 0 && processedConfigs.every(job =>
      job.jobTitleName.trim() !== '' &&
      job.locations && job.locations.length > 0 &&
      job.locations.every((l: any) => l.locationName.trim() !== '' && l.locationTimer.trim() !== '' && !isNaN(parseFloat(l.locationTimer)))
    );

    if (!isValid) {
      alert('Incomplete Configuration:\nEvery Job Title must have at least one Location, and every Location must have a valid Timer (in minutes).');
      return false;
    }

    // 3. Persist to Storage
    chrome.storage.local.set({ jobConfigs: processedConfigs, runInLoop }, () => {
      setJobConfigs(processedConfigs);

      // Update JSON editor if it's open (usually it will be closed right after)
      if (jsonEditorRef.current) {
        const textarea = jsonEditorRef.current.querySelector('textarea');
        if (textarea) {
          textarea.value = JSON.stringify(stripIds(processedConfigs), null, 2);
        }
      }

      // Show success toast
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = 'Settings saved and applied successfully!';
        toast.style.display = 'block';
        toast.style.backgroundColor = '#28a745';
        setTimeout(() => {
          toast.style.display = 'none';
          toast.style.backgroundColor = '';
        }, 3000);
      }
    });

    return true;
  };

  const handleJsonSave = () => {
    if (jsonEditorRef.current) {
      const textarea = jsonEditorRef.current.querySelector('textarea');
      if (textarea) {
        try {
          const rawConfigs = JSON.parse(textarea.value);
          const configsWithIds = restoreIds(rawConfigs);

          // Use performFullSave to validate and persist immediately
          const success = performFullSave(configsWithIds);
          if (success) {
            setIsJsonEditing(false);
          }
        } catch (e) {
          const toast = document.getElementById('toast-message');
          if (toast) {
            toast.textContent = 'Invalid JSON format. Please check your syntax.';
            toast.style.display = 'block';
            toast.style.backgroundColor = '#dc3545';
            setTimeout(() => {
              toast.style.display = 'none';
              toast.style.backgroundColor = '';
            }, 5000);
          }
          console.error('Error parsing JSON:', e);
        }
      }
    }
  };

  const formatMinsToHrMin = (minsStr: string) => {
    const mins = parseFloat(minsStr) || 0;
    if (mins === 0) return '0m';
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs === 0) return `${remainingMins}m`;
    return `${hrs}h ${remainingMins}m`;
  };

  const calculateTotalConfigTimer = (configs: any[]) => {
    let totalMins = 0;
    configs.forEach(config => {
      totalMins += parseFloat(config.jobConfigTimer) || 0;
    });
    return formatMinsToHrMin(totalMins.toString());
  };

  const getEffectiveJobConfigs = () => {
    // This function is still used for UI previews, but the actual saving logic
    // is now centralized in performFullSave.
    return jobConfigs.map(job => {
      const hasLocations = job.locations && job.locations.some(l => l.locationName || l.locationTimer);
      const hasJobTypes = job.jobTypes && job.jobTypes.some(jt => jt.jobTypeName || jt.jobTypeTimer);
      const hasWorkplaceTypes = job.workplaceTypes && job.workplaceTypes.some(wt => wt.workplaceTypeName || wt.workplaceTypeTimer);

      const updatedJob = { ...job };

      // Bottom-up calculation
      updatedJob.jobTypes = (job.jobTypes || []).map(jt => {
        if (hasLocations) {
          const sum = job.locations.reduce((acc, loc) => acc + (parseFloat(loc.locationTimer) || 0), 0);
          return { ...jt, jobTypeTimer: sum.toString() };
        }
        return jt;
      });

      updatedJob.workplaceTypes = (job.workplaceTypes || []).map(wt => {
        if (hasJobTypes) {
          const sum = updatedJob.jobTypes.reduce((acc, jt) => acc + (parseFloat(jt.jobTypeTimer) || 0), 0);
          return { ...wt, workplaceTypeTimer: sum.toString() };
        } else if (hasLocations) {
          const sum = job.locations.reduce((acc, loc) => acc + (parseFloat(loc.locationTimer) || 0), 0);
          return { ...wt, workplaceTypeTimer: sum.toString() };
        }
        return wt;
      });

      if (hasWorkplaceTypes) {
        updatedJob.jobConfigTimer = updatedJob.workplaceTypes.reduce((acc, wt) => acc + (parseFloat(wt.workplaceTypeTimer) || 0), 0).toString();
      } else if (hasJobTypes) {
        updatedJob.jobConfigTimer = updatedJob.jobTypes.reduce((acc, jt) => acc + (parseFloat(jt.jobTypeTimer) || 0), 0).toString();
      } else if (hasLocations) {
        updatedJob.jobConfigTimer = job.locations.reduce((acc, loc) => acc + (parseFloat(loc.locationTimer) || 0), 0).toString();
      }

      return updatedJob;
    });
  };

  const handleSave = () => {
    performFullSave(jobConfigs);
  };

  const addJobConfig = () => {
    setJobConfigs([
      ...jobConfigs,
      {
        id: `job-${Date.now()}`,
        jobTitleName: '',
        jobConfigTimer: '',
        sequence: '',
        locations: [{
          id: `loc-${Date.now()}`,
          locationName: '',
          locationTimer: ''
        }],
        jobTypes: [{
          id: `type-${Date.now()}`,
          jobTypeName: '',
          jobTypeTimer: ''
        }],
        workplaceTypes: [{
          id: `wplace-${Date.now()}`,
          workplaceTypeName: '',
          workplaceTypeTimer: ''
        }]
      }
    ]);
  };

  const removeJobConfig = (jobIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs.splice(jobIndex, 1);
    setJobConfigs(updatedConfigs);
  };

  const updateJobConfig = (jobIndex: number, field: string, value: string) => {
    const updatedConfigs = [...jobConfigs];
    (updatedConfigs[jobIndex] as any)[field] = value;
    setJobConfigs(updatedConfigs);
  };

  const addLocation = (jobIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].locations.push({
      id: `loc-${Date.now()}`,
      locationName: '',
      locationTimer: ''
    });
    setJobConfigs(updatedConfigs);
  };

  const removeLocation = (jobIndex: number, locationIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].locations.splice(locationIndex, 1);
    setJobConfigs(updatedConfigs);
  };

  const updateLocation = (jobIndex: number, locationIndex: number, field: string, value: string) => {
    const updatedConfigs = [...jobConfigs];
    (updatedConfigs[jobIndex].locations[locationIndex] as any)[field] = value;
    setJobConfigs(updatedConfigs);
  };

  const addJobType = (jobIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].jobTypes.push({
      id: `type-${Date.now()}`,
      jobTypeName: '',
      jobTypeTimer: ''
    });
    setJobConfigs(updatedConfigs);
  };

  const removeJobType = (jobIndex: number, typeIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].jobTypes.splice(typeIndex, 1);
    setJobConfigs(updatedConfigs);
  };

  const updateJobType = (jobIndex: number, typeIndex: number, field: string, value: string) => {
    const updatedConfigs = [...jobConfigs];
    (updatedConfigs[jobIndex].jobTypes[typeIndex] as any)[field] = value;
    setJobConfigs(updatedConfigs);
  };

  const addWorkplaceType = (jobIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].workplaceTypes.push({
      id: `wplace-${Date.now()}`,
      workplaceTypeName: '',
      workplaceTypeTimer: ''
    });
    setJobConfigs(updatedConfigs);
  };

  const removeWorkplaceType = (jobIndex: number, typeIndex: number) => {
    const updatedConfigs = [...jobConfigs];
    updatedConfigs[jobIndex].workplaceTypes.splice(typeIndex, 1);
    setJobConfigs(updatedConfigs);
  };

  const updateWorkplaceType = (jobIndex: number, typeIndex: number, field: string, value: string) => {
    const updatedConfigs = [...jobConfigs];
    (updatedConfigs[jobIndex].workplaceTypes[typeIndex] as any)[field] = value;
    setJobConfigs(updatedConfigs);
  };

  return (
    <div className="search-timer-config">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Search and Timer Configuration
          <button
            className="info-button"
            onClick={() => (window as any).showInfoModal('search-timer')}
            title="Learn about search automation"
          >
            ℹ️
          </button>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>
          Overall Duration: <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>{calculateTotalConfigTimer(getEffectiveJobConfigs())}</span>
        </div>
      </h2>

      {/* Run in Loop Toggle */}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={runInLoop}
            onChange={(e) => setRunInLoop(e.target.checked)}
          />
          Run in Loop
        </label>
        <small>
          Enable this option to continuously repeat the job search process.
          When disabled, the search will run only once through all configurations.
        </small>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="jobs-container">
          {getEffectiveJobConfigs().map((jobConfig, jobIndex) => (
            <div key={jobConfig.id} className="job">
              <div className="jobConfig">
                <div className="form-group">
                  <label>Job Title:</label>
                  <input
                    type="text"
                    className="jobTitleName"
                    value={jobConfig.jobTitleName}
                    onChange={(e) => updateJobConfig(jobIndex, 'jobTitleName', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Overall Timer (mins):</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="text"
                      className="jobConfigTimer"
                      value={jobConfig.jobConfigTimer}
                      disabled={true} // Always auto-calculated if ANY sub-component exists
                      style={{ backgroundColor: '#f0f0f0' }}
                    />
                    <small style={{ whiteSpace: 'nowrap' }}>
                      ({formatMinsToHrMin(jobConfig.jobConfigTimer)})
                    </small>
                  </div>
                </div>

                <div className="accordion">
                  <h3>Locations</h3>
                  <div className="panel">
                    <div className="locations-container">
                      {jobConfig.locations.map((location, locationIndex) => (
                        <div key={location.id} className="location">
                          <div className="form-group pair">
                            <div className="form-group">
                              <label>Location Name:</label>
                              <input
                                type="text"
                                className="locationName"
                                value={location.locationName}
                                onChange={(e) => updateLocation(jobIndex, locationIndex, 'locationName', e.target.value)}
                              />
                            </div>

                            <div className="form-group">
                              <label>Location Timer (mins) <span style={{ color: 'red' }}>*</span>:</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="text"
                                  className="locationTimer"
                                  value={location.locationTimer}
                                  onChange={(e) => updateLocation(jobIndex, locationIndex, 'locationTimer', e.target.value)}
                                  placeholder="Minutes (e.g. 10)"
                                />
                                <small style={{ whiteSpace: 'nowrap' }}>
                                  ({formatMinsToHrMin(location.locationTimer)})
                                </small>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeLocation(jobIndex, locationIndex)}
                          >
                            Remove Location
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => addLocation(jobIndex)}
                      >
                        Add Location
                      </button>
                    </div>
                  </div>
                </div>

                <div className="accordion">
                  <h3>Job Types</h3>
                  <div className="panel">
                    <div className="job-types-container">
                      {jobConfig.jobTypes.map((jobType, typeIndex) => (
                        <div key={jobType.id} className="jobType">
                          <div className="form-group pair">
                            <div className="form-group">
                              <label>Job Type:</label>
                              <select
                                className="jobTypeName"
                                value={jobType.jobTypeName}
                                onChange={(e) => updateJobType(jobIndex, typeIndex, 'jobTypeName', e.target.value)}
                              >
                                <option value="">Select Job Type</option>
                                <option value="Full-time">Full-time</option>
                                <option value="Part-time">Part-time</option>
                                <option value="Contract">Contract</option>
                                <option value="Temporary">Temporary</option>
                                <option value="Volunteer">Volunteer</option>
                                <option value="Internship">Internship</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Job Type Timer (Auto):</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="text"
                                  className="jobTypeTimer"
                                  value={jobConfig.jobTypes[typeIndex].jobTypeTimer}
                                  disabled={true}
                                  style={{ backgroundColor: '#f0f0f0' }}
                                />
                                <small style={{ whiteSpace: 'nowrap' }}>
                                  ({formatMinsToHrMin(jobConfig.jobTypes[typeIndex].jobTypeTimer)})
                                </small>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeJobType(jobIndex, typeIndex)}
                          >
                            Remove Job Type
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => addJobType(jobIndex)}
                      >
                        Add Job Type
                      </button>
                    </div>
                  </div>
                </div>

                <div className="accordion">
                  <h3>Workplace Types</h3>
                  <div className="panel">
                    <div className="workplace-types-container">
                      {jobConfig.workplaceTypes && jobConfig.workplaceTypes.map((workplaceType, typeIndex) => (
                        <div key={workplaceType.id} className="workplaceType">
                          <div className="form-group pair">
                            <div className="form-group">
                              <label>Workplace Type:</label>
                              <select
                                className="workplaceTypeName"
                                value={workplaceType.workplaceTypeName}
                                onChange={(e) => updateWorkplaceType(jobIndex, typeIndex, 'workplaceTypeName', e.target.value)}
                              >
                                <option value="">Select Workplace Type</option>
                                <option value="Onsite">Onsite</option>
                                <option value="Remote">Remote</option>
                                <option value="Hybrid">Hybrid</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label>Workplace Type Timer (Auto):</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="text"
                                  className="workplaceTypeTimer"
                                  value={jobConfig.workplaceTypes[typeIndex].workplaceTypeTimer}
                                  disabled={true}
                                  style={{ backgroundColor: '#f0f0f0' }}
                                />
                                <small style={{ whiteSpace: 'nowrap' }}>
                                  ({formatMinsToHrMin(jobConfig.workplaceTypes[typeIndex].workplaceTypeTimer)})
                                </small>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => removeWorkplaceType(jobIndex, typeIndex)}
                          >
                            Remove Workplace Type
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn"
                        onClick={() => addWorkplaceType(jobIndex)}
                      >
                        Add Workplace Type
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Sequence:</label>
                  <input
                    type="number"
                    className="sequence"
                    value={jobConfig.sequence}
                    onChange={(e) => updateJobConfig(jobIndex, 'sequence', e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeJobConfig(jobIndex)}
                >
                  Remove Job Config
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-primary"
            onClick={addJobConfig}
          >
            Add Job Config
          </button>
        </div>

        <div className="accordion developer-only">
          <h3>Jobs in JSON Format (Auto Generated)</h3>
          <div className="panel">
            <div ref={jsonEditorRef} id="jobsJsonEditor"></div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary">
          Save Job Configs
        </button>
      </form>

      <div id="toast-message" style={{
        display: 'none',
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#28a745',
        color: 'white',
        padding: '15px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
      </div>
    </div>
  );
};

export default SearchTimerConfig;