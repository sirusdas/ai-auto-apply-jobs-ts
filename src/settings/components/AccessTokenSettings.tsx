import React, { useState, useEffect } from 'react';

const AccessTokenSettings: React.FC = () => {
  const [accessToken, setAccessToken] = useState('');
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    // Load saved access token
    chrome.storage.local.get(['accessToken'], (result) => {
      if (result.accessToken) {
        setAccessToken(result.accessToken);
      }
    });
  }, []);

  const handleSave = () => {
    if (!accessToken.trim()) {
      setStatus({ type: 'error', message: 'Please enter an access token.' });
      return;
    }

    chrome.storage.local.set({ accessToken: accessToken.trim() }, () => {
      setStatus({ type: 'success', message: 'Access token saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    });
  };

  return (
    <div className="access-token-settings">
      <h2>Google Gemini Access Token</h2>
      <div className="form-group">
        <label htmlFor="access-token-input">Google Gemini Access Token:</label>
        <input
          type="text"
          id="access-token-input"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Enter your access token"
        />
      </div>
      <button className="btn btn-primary" onClick={handleSave}>
        Save
      </button>
      
      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default AccessTokenSettings;