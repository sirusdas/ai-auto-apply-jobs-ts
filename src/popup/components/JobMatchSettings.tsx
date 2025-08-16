import React, { useState, useEffect } from 'react';

const JobMatchSettings: React.FC = () => {
  const [minMatchScore, setMinMatchScore] = useState<number>(3);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['minMatchScore'], (result) => {
      if (result.minMatchScore) {
        setMinMatchScore(parseInt(result.minMatchScore, 10));
      }
    });
  }, []);

  const handleSaveSettings = () => {
    chrome.storage.local.set({ minMatchScore: minMatchScore.toString() }, () => {
      setStatus('Match settings saved successfully!');
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    });
  };

  return (
    <div className="job-match-settings">
      <h2>Job Match Settings</h2>
      
      <div className="form-group">
        <label htmlFor="min-match-score">Minimum Match Score (1-5):</label>
        <input
          type="number"
          id="min-match-score"
          min="1"
          max="5"
          value={minMatchScore}
          onChange={(e) => setMinMatchScore(parseInt(e.target.value) || 0)}
        />
        <small>
          Set a minimum score for job matching. The extension will only apply to jobs that meet or exceed this score.
        </small>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleSaveSettings}
      >
        Save Match Settings
      </button>
      
      {status && (
        <div className="status-message success">
          {status}
        </div>
      )}
      
      <div className="info-section">
        <h3>About Job Match Settings</h3>
        <p>
          By setting a minimum score, you can instruct the extension to only apply for jobs that are a good fit for your profile, 
          saving you time and focusing on relevant opportunities.
        </p>
        <p>
          <strong>Recommendation:</strong> A score of 3 or 4 is a good starting point.
        </p>
      </div>
    </div>
  );
};

export default JobMatchSettings;