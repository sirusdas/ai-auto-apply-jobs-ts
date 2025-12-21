import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface AppliedJob {
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string; // Now stores full ISO timestamp
  applicationFormData?: any;
}

const AppliedJobs: React.FC = () => {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<AppliedJob[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [chartType, setChartType] = useState<string>('line');
  const [timeRange, setTimeRange] = useState<string>('month');
  const [selectedJob, setSelectedJob] = useState<AppliedJob | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [planType, setPlanType] = useState<string>('Free');
  const chartRef = useRef<any>(null);

  useEffect(() => {
    chrome.storage.local.get(['planType'], (result) => {
      if (result.planType) setPlanType(result.planType);
    });
  }, []);

  // Generate random colors for charts
  const generateColors = (count: number) => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137) % 360; // Spread colors evenly
      colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
  };

  useEffect(() => {
    // Load applied jobs from storage
    chrome.storage.local.get(['appliedJobs'], (result) => {
      if (result.appliedJobs) {
        const jobs: AppliedJob[] = [];
        // Extract all jobs from the grouped storage structure
        Object.keys(result.appliedJobs).forEach(dateKey => {
          if (Array.isArray(result.appliedJobs[dateKey])) {
            result.appliedJobs[dateKey].forEach((job: AppliedJob) => {
              jobs.push({
                ...job,
                // Ensure we have a valid appliedDate string
                appliedDate: job.appliedDate || dateKey
              });
            });
          }
        });

        // Sort by date descending (latest first)
        jobs.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

        setAppliedJobs(jobs);
        setFilteredJobs(jobs);
        console.log(`Loaded ${jobs.length} jobs, latest is ${jobs[0]?.jobTitle}`);
      }
    });
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = [...appliedJobs];

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(job =>
        job.appliedDate.startsWith(dateFilter)
      );
    }

    // Ensure sorting is preserved after filtering
    filtered.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

    setFilteredJobs(filtered);
  }, [searchTerm, dateFilter, appliedJobs]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
  };

  const getTotalJobsCount = () => {
    return appliedJobs.length;
  };

  const handleViewApplication = (job: AppliedJob) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  // Process data for charts
  const getChartData = () => {
    // Filter jobs based on time range
    const now = new Date();
    let filteredJobsByTime = [...appliedJobs];

    if (timeRange === 'day') {
      const today = now.toISOString().split('T')[0];
      filteredJobsByTime = appliedJobs.filter(job => job.appliedDate.startsWith(today));
    } else if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredJobsByTime = appliedJobs.filter(job =>
        new Date(job.appliedDate) >= oneWeekAgo
      );
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      filteredJobsByTime = appliedJobs.filter(job =>
        new Date(job.appliedDate) >= oneMonthAgo
      );
    }

    // Prepare data for time-based chart
    const dateCounts: Record<string, number> = {};
    filteredJobsByTime.forEach(job => {
      const datePart = job.appliedDate.split('T')[0];
      dateCounts[datePart] = (dateCounts[datePart] || 0) + 1;
    });

    const sortedDates = Object.keys(dateCounts).sort();
    const chartData = {
      labels: sortedDates,
      datasets: [{
        label: 'Applications',
        data: sortedDates.map(date => dateCounts[date]),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: chartType === 'line'
      }]
    };

    return chartData;
  };

  // Process data for location-based charts
  const getLocationChartData = () => {
    const locationCounts: Record<string, number> = {};

    // Filter jobs based on current filters
    let jobsToProcess = [...filteredJobs];

    // Apply time range filter for location chart as well
    const now = new Date();
    if (timeRange === 'day') {
      const today = now.toISOString().split('T')[0];
      jobsToProcess = jobsToProcess.filter(job => job.appliedDate.startsWith(today));
    } else if (timeRange === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      jobsToProcess = jobsToProcess.filter(job =>
        new Date(job.appliedDate) >= oneWeekAgo
      );
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      jobsToProcess = jobsToProcess.filter(job =>
        new Date(job.appliedDate) >= oneMonthAgo
      );
    }

    jobsToProcess.forEach(job => {
      locationCounts[job.location] = (locationCounts[job.location] || 0) + 1;
    });

    const locations = Object.keys(locationCounts);
    const counts = locations.map(location => locationCounts[location]);
    const colors = generateColors(locations.length);

    const barData = {
      labels: locations,
      datasets: [{
        label: 'Applications by Location',
        data: counts,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('50%', '40%')),
        borderWidth: 1
      }]
    };

    const pieData = {
      labels: locations,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('50%', '40%')),
        borderWidth: 1
      }]
    };

    return { barData, pieData, locationCounts };
  };

  const chartData = getChartData();
  const { barData, pieData, locationCounts } = getLocationChartData();

  // Chart options
  const lineChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Job Applications Over Time',
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeRange === 'day' ? 'hour' : timeRange === 'week' ? 'day' : 'day' as any,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const barChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Job Applications by Location',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const pieChartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Job Applications by Location',
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const count = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((count / total) * 100);
            return `${label}: ${count} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="applied-jobs">
      <h2>Applied Jobs</h2>

      <div className="stats">
        <h3>Total Jobs Applied: {getTotalJobsCount()}</h3>
        <div className="plan-badge">
          Current Plan: <span className={`badge plan-${planType.toLowerCase()}`}>{planType}</span>
        </div>
      </div>

      <div className="chart-controls">
        <h3>Application Analytics {planType === 'Free' && <span className="pro-label">(Pro Feature)</span>}</h3>
        <div className="controls-grid">
          <div className="form-group">
            <label htmlFor="chart-type">Chart Type:</label>
            <select
              id="chart-type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="time-range">Time Range:</label>
            <select
              id="time-range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="day">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="chart-container">
        {chartType === 'line' && (
          <Line data={chartData} options={lineChartOptions} />
        )}
        {chartType === 'bar' && (
          <Bar data={barData} options={barChartOptions} />
        )}
        {chartType === 'pie' && (
          <Pie data={pieData} options={pieChartOptions} />
        )}
      </div>

      <div className="location-stats">
        <h3>Location Distribution</h3>
        <ul>
          {Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([location, count]) => (
              <li key={location}>
                {location}: {count}
              </li>
            ))}
        </ul>
      </div>

      <div className="filters">
        <div className="form-group">
          <label htmlFor="search">Search:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, company, or location"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date-filter">Filter by Date:</label>
          <input
            type="date"
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleClearFilters}
        >
          Clear Filters
        </button>
      </div>

      <div className="jobs-list">
        <h3>Applied Jobs List ({filteredJobs.length} jobs)</h3>
        {filteredJobs.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>View Application</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 border">{new Date(job.appliedDate).toLocaleString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</td>
                  <td className="px-4 py-2 border">{job.jobTitle}</td>
                  <td className="px-4 py-2 border">{job.company}</td>
                  <td className="px-4 py-2 border">{job.location}</td>
                  <td className="px-4 py-2 border">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleViewApplication(job)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No applied jobs found.</p>
        )}
      </div>

      {/* Application Details Modal */}
      {showModal && selectedJob && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Application Details</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="job-info">
                <h3>{selectedJob.jobTitle}</h3>
                <p><strong>Company:</strong> {selectedJob.company}</p>
                <p><strong>Location:</strong> {selectedJob.location}</p>
                <p><strong>Applied Date:</strong> {selectedJob.appliedDate}</p>
              </div>

              {selectedJob.applicationFormData ? (
                <div className="mt-4">
                  <h3 className="font-bold mb-2">Application Details</h3>
                  <p><strong>Submitted At:</strong> {new Date(selectedJob.applicationFormData.submittedAt).toLocaleString()}</p>

                  {selectedJob.applicationFormData.inputs.length > 0 && (
                    <div className="form-section">
                      <h5>Input Fields</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Label/Question</th>
                            <th>Value</th>
                            <th>Placeholder</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedJob.applicationFormData.inputs.map((input: any, index: number) => {
                            // Try to extract a meaningful label from the input label or name
                            let label = input.label || input.name || 'N/A';

                            // If the name is a URN, try to find a better label
                            if (label.startsWith('urn:li:')) {
                              // Extract a human-readable part from the URN if possible
                              const urnParts = label.split(':');
                              if (urnParts.length > 2) {
                                // Try to get the last meaningful part
                                const lastPart = urnParts[urnParts.length - 1];
                                if (lastPart.includes('(') && lastPart.includes(')')) {
                                  const innerPart = lastPart.substring(lastPart.indexOf('(') + 1, lastPart.lastIndexOf(')'));
                                  const innerParts = innerPart.split(',');
                                  if (innerParts.length > 2) {
                                    // This might be a question identifier, show the type part
                                    label = innerParts[2] || 'Multiple Choice Question';
                                  } else {
                                    label = 'Form Field';
                                  }
                                } else {
                                  label = lastPart;
                                }
                              }
                            }

                            // For generic labels, try to infer from type
                            if (label === 'N/A' || label.startsWith('urn:li:')) {
                              switch (input.type) {
                                case 'text':
                                  label = 'Text Input';
                                  break;
                                case 'email':
                                  label = 'Email Address';
                                  break;
                                case 'tel':
                                  label = 'Phone Number';
                                  break;
                                case 'file':
                                  label = 'File Upload';
                                  break;
                                case 'textarea':
                                  label = 'Text Area';
                                  break;
                                case 'radio':
                                  label = 'Radio Button';
                                  break;
                                case 'checkbox':
                                  label = 'Checkbox';
                                  break;
                                default:
                                  label = input.type ? `${input.type.charAt(0).toUpperCase() + input.type.slice(1)} Field` : 'Unknown Field';
                              }
                            }

                            // Special handling for common fields
                            if (input.placeholder) {
                              if (input.placeholder.toLowerCase().includes('first name') ||
                                input.placeholder.toLowerCase().includes('given name')) {
                                label = 'First Name';
                              } else if (input.placeholder.toLowerCase().includes('last name') ||
                                input.placeholder.toLowerCase().includes('surname') ||
                                input.placeholder.toLowerCase().includes('family name')) {
                                label = 'Last Name';
                              } else if (input.placeholder.toLowerCase().includes('phone') ||
                                input.placeholder.toLowerCase().includes('mobile')) {
                                label = 'Phone Number';
                              } else if (input.placeholder.toLowerCase().includes('email')) {
                                label = 'Email Address';
                              }
                            }

                            return (
                              <tr key={index}>
                                <td>{input.type}</td>
                                <td>{label}</td>
                                <td>{input.value || 'N/A'}</td>
                                <td>{input.placeholder || 'N/A'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedJob.applicationFormData.radios.length > 0 && (
                    <div className="form-section">
                      <h5>Radio Buttons</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Question</th>
                            <th>Selected Answer</th>
                            <th>All Options</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedJob.applicationFormData.radios.map((radio: any, index: number) => {
                            // Try to create a more user-friendly question label
                            let questionLabel = radio.name || 'Multiple Choice Question';

                            // Improve URN-based labels
                            if (questionLabel.startsWith('urn:li:') && radio.options && radio.options.length > 0) {
                              // Try to infer question from options if they have meaningful text
                              const optionTexts = radio.options.map((opt: any) => opt.text || opt.value).filter(Boolean);
                              if (optionTexts.length > 0) {
                                // If options are meaningful, we might be able to guess the question
                                if (optionTexts.some((t: string) =>
                                  t.toLowerCase().includes('yes') || t.toLowerCase().includes('no'))) {
                                  questionLabel = 'Yes/No Question';
                                } else if (optionTexts.some((t: string) =>
                                  t.toLowerCase().includes('male') || t.toLowerCase().includes('female'))) {
                                  questionLabel = 'Gender Selection';
                                } else {
                                  questionLabel = 'Multiple Choice Question';
                                }
                              }
                            }

                            return (
                              <tr key={index}>
                                <td>{questionLabel}</td>
                                <td>{radio.selectedValue || 'N/A'}</td>
                                <td>
                                  {radio.options && radio.options.map((opt: any, optIndex: number) => (
                                    <span key={optIndex}>
                                      {opt.text || opt.value}{optIndex < radio.options.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedJob.applicationFormData.dropdowns.length > 0 && (
                    <div className="form-section">
                      <h5>Dropdowns</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Field Name</th>
                            <th>Selected Value</th>
                            <th>Options</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedJob.applicationFormData.dropdowns.map((dropdown: any, index: number) => {
                            // Try to create a more user-friendly field name
                            let fieldName = dropdown.label || dropdown.name || 'Dropdown Selection';

                            // Improve URN-based labels
                            if (fieldName.startsWith('urn:li:')) {
                              // Try to extract meaningful name from URN
                              const urnParts = fieldName.split(':');
                              if (urnParts.length > 2) {
                                const lastPart = urnParts[urnParts.length - 1];
                                if (lastPart.includes('(') && lastPart.includes(')')) {
                                  const innerPart = lastPart.substring(lastPart.indexOf('(') + 1, lastPart.lastIndexOf(')'));
                                  const innerParts = innerPart.split(',');
                                  if (innerParts.length > 2) {
                                    fieldName = innerParts[2] || 'Selection Field';
                                  } else {
                                    fieldName = 'Dropdown Field';
                                  }
                                } else {
                                  fieldName = lastPart.replace(/([A-Z])/g, ' $1').trim();
                                }
                              }
                            }

                            // Special handling for common dropdowns
                            if (dropdown.options && dropdown.options.length > 0) {
                              const optionTexts = dropdown.options.map((opt: any) => opt.text || opt.value);

                              // Check for country dropdowns
                              if (optionTexts.some((t: string) =>
                                ['India', 'United States', 'Canada', 'United Kingdom'].includes(t))) {
                                fieldName = 'Country Selection';
                              }
                              // Check for state/province dropdowns
                              else if (optionTexts.some((t: string) =>
                                ['California', 'Texas', 'New York', 'Ontario', 'British Columbia'].includes(t))) {
                                fieldName = 'State/Province Selection';
                              }
                              // Check for year dropdowns
                              else if (optionTexts.every((t: string) => !isNaN(Number(t)) && Number(t) > 1900 && Number(t) < 2100)) {
                                fieldName = 'Year Selection';
                              }
                            }

                            // Determine how the field was filled
                            let filledBy = 'Unknown';
                            if (dropdown.status) {
                              filledBy = dropdown.status.filledBy === 'ai' ? 'AI' : 'System (Validation)';
                            } else if (dropdown.selectedValue) {
                              // If there's a value but no status, it might be pre-filled
                              filledBy = 'Pre-filled';
                            }

                            return (
                              <tr key={index}>
                                <td>{fieldName}</td>
                                <td>{dropdown.selectedValue || 'N/A'}</td>
                                <td>
                                  {dropdown.options && dropdown.options.length > 0 ? (
                                    <>
                                      {dropdown.options.slice(0, 5).map((opt: any, optIndex: number) => (
                                        <span key={optIndex}>
                                          {opt.text || opt.value}{optIndex < Math.min(4, dropdown.options.length - 1) ? ', ' : ''}
                                        </span>
                                      ))}
                                      {dropdown.options.length > 5 && (
                                        <span>... +{dropdown.options.length - 5} more</span>
                                      )}
                                    </>
                                  ) : (
                                    'No options available'
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedJob.applicationFormData.checkboxes && selectedJob.applicationFormData.checkboxes.length > 0 && (
                    <div className="form-section">
                      <h5>Checkboxes</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Question/Label</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedJob.applicationFormData.checkboxes.map((checkbox: any, index: number) => (
                            <tr key={index}>
                              <td>{checkbox.name || 'Checkbox'}</td>
                              <td>{checkbox.checked ? 'Checked' : 'Unchecked'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <p>No form data available for this application.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="info-section">
        <h3>About Applied Jobs</h3>
        <p>
          This section provides a comprehensive overview of all the jobs you've applied to using the extension.
        </p>
        <ul>
          <li>View a complete list of applied jobs.</li>
          <li>Filter jobs by date to track your application history.</li>
          <li>Search for specific jobs by title, company, or location.</li>
          <li>Visualize your application trends with interactive charts.</li>
          <li>Analyze your job search patterns by location.</li>
        </ul>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .plan-badge {
          margin-top: 10px;
          font-size: 0.9em;
          color: #666;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: bold;
          text-transform: uppercase;
        }
        .plan-pro { background: #ebf8ff; color: #2b6cb0; }
        .plan-enterprise { background: #faf5ff; color: #6b46c1; }
        .plan-free { background: #f7fafc; color: #4a5568; }
        
        .pro-label {
          font-size: 0.5em;
          color: #2b6cb0;
          vertical-align: middle;
          margin-left: 8px;
          background: #ebf8ff;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 10px;
        }
      `}} />
    </div>
  );
};

export default AppliedJobs;