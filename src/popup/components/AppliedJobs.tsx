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
  appliedDate: string;
}

const AppliedJobs: React.FC = () => {
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<AppliedJob[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [chartType, setChartType] = useState<string>('line');
  const [timeRange, setTimeRange] = useState<string>('month');
  const chartRef = useRef<any>(null);

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
        Object.keys(result.appliedJobs).forEach(date => {
          result.appliedJobs[date].forEach((job: AppliedJob) => {
            jobs.push({
              ...job,
              appliedDate: new Date(job.appliedDate).toISOString().split('T')[0] // Normalize date format
            });
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

  // Process data for charts
  const getChartData = () => {
    // Filter jobs based on time range
    const now = new Date();
    let filteredJobsByTime = [...appliedJobs];
    
    if (timeRange === 'day') {
      const today = now.toISOString().split('T')[0];
      filteredJobsByTime = appliedJobs.filter(job => job.appliedDate === today);
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
      dateCounts[job.appliedDate] = (dateCounts[job.appliedDate] || 0) + 1;
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
      jobsToProcess = jobsToProcess.filter(job => job.appliedDate === today);
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
          label: function(context: any) {
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
      </div>
      
      <div className="chart-controls">
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
          <li>Visualize your application trends with interactive charts.</li>
          <li>Analyze your job search patterns by location.</li>
        </ul>
      </div>
    </div>
  );
};

export default AppliedJobs;