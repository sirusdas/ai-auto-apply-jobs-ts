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
  }>>([]);
  
  const jsonEditorRef = useRef<HTMLDivElement>(null);
  const jsonEditorInstance = useRef<any>(null);

  useEffect(() => {
    // Load saved job configurations
    chrome.storage.local.get(['jobConfigs'], (result) => {
      if (result.jobConfigs) {
        setJobConfigs(result.jobConfigs);
      } else {
        // Initialize with one empty job config
        setJobConfigs([{
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
          }]
        }]);
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
        
        // Create a simple textarea-based JSON editor for now
        jsonEditorRef.current.innerHTML = '';
        const textarea = document.createElement('textarea');
        textarea.value = JSON.stringify(jobConfigs, null, 2);
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '14px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.backgroundColor = '#f8f9fa';
        textarea.readOnly = true;
        jsonEditorRef.current.appendChild(textarea);
      } catch (e) {
        console.error('Error initializing JSON editor:', e);
      }
    }
  }, [jobConfigs]);

  const handleSave = () => {
    chrome.storage.local.set({ jobConfigs }, () => {
      // Show success message
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = 'Job configurations saved successfully!';
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 3000);
      }
      
      // Update JSON editor
      if (jsonEditorRef.current) {
        const textarea = jsonEditorRef.current.querySelector('textarea');
        if (textarea) {
          textarea.value = JSON.stringify(jobConfigs, null, 2);
        }
      }
    });
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

  return (
    <div className="search-timer-config">
      <h2>Search and Timer Configuration</h2>
      
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="jobs-container">
          {jobConfigs.map((jobConfig, jobIndex) => (
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
                  <label>Timer:</label>
                  <input
                    type="text"
                    className="jobConfigTimer"
                    value={jobConfig.jobConfigTimer}
                    onChange={(e) => updateJobConfig(jobIndex, 'jobConfigTimer', e.target.value)}
                  />
                </div>
                
                <div className="accordion">
                  <h3>Locations</h3>
                  <div className="panel">
                    <div className="locations-container">
                      {jobConfig.locations.map((location, locationIndex) => (
                        <div key={location.id} className="location">
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
                            <label>Location Timer:</label>
                            <input
                              type="text"
                              className="locationTimer"
                              value={location.locationTimer}
                              onChange={(e) => updateLocation(jobIndex, locationIndex, 'locationTimer', e.target.value)}
                            />
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
                          <div className="form-group">
                            <label>Job Type:</label>
                            <input
                              type="text"
                              className="jobTypeName"
                              value={jobType.jobTypeName}
                              onChange={(e) => updateJobType(jobIndex, typeIndex, 'jobTypeName', e.target.value)}
                            />
                          </div>
                          
                          <div className="form-group">
                            <label>Job Type Timer:</label>
                            <input
                              type="text"
                              className="jobTypeTimer"
                              value={jobType.jobTypeTimer}
                              onChange={(e) => updateJobType(jobIndex, typeIndex, 'jobTypeTimer', e.target.value)}
                            />
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
    </div>
  );
};

export default SearchTimerConfig;