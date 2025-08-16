import React, { useState, useEffect } from 'react';

interface AppliedJob {
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
}

const AppliedJobs: React.FC = () => {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<AppliedJob[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    // Load applied jobs from storage
    chrome.storage.local.get(['appliedJobs'], (result) => {
      if (result.appliedJobs) {
        const jobs: AppliedJob[] = [];
        Object.keys(result.appliedJobs).forEach(date => {
          result.appliedJobs[date].forEach((job: AppliedJob) => {
            jobs.push(job);
          });
        });
        setAppliedJobs(jobs);
        setFilteredJobs(jobs);
      }
    });
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = appliedJobs;
    
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (dateFilter) {
      filtered = filtered.filter(job => 
        job.appliedDate === dateFilter
      );
    }
    
    setFilteredJobs(filtered);
  }, [searchTerm, dateFilter, appliedJobs]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
  };

  const getTotalJobsCount = () => {
    return appliedJobs.length;
  };

  return (
    <div className="applied-jobs">
      <h2>Applied Jobs</h2>
      
      <div className="stats">
        <h3>Total Jobs Applied: {getTotalJobsCount()}</h3>
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
        {filteredJobs.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, index) => (
                <tr key={index}>
                  <td>{job.appliedDate}</td>
                  <td>{job.jobTitle}</td>
                  <td>{job.company}</td>
                  <td>{job.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No applied jobs found.</p>
        )}
      </div>
      
      <div className="info-section">
        <h3>About Applied Jobs</h3>
        <p>
          This section provides a comprehensive overview of all the jobs you've applied to using the extension.
        </p>
        <ul>
          <li>View a complete list of applied jobs.</li>
          <li>Filter jobs by date to track your application history.</li>
          <li>Search for specific jobs by title, company, or location.</li>
        </ul>
      </div>
    </div>
  );
};

export default AppliedJobs;