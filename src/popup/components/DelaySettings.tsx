import React, { useState, useEffect } from 'react';

const DelaySettings: React.FC = () => {
  const [veryShortDelay, setVeryShortDelay] = useState<number>(1000);
  const [shortDelay, setShortDelay] = useState<number>(5000);
  const [longDelay, setLongDelay] = useState<number>(7000);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load saved delay settings
    chrome.storage.local.get(['veryShortDelay', 'shortDelay', 'longDelay'], (result) => {
      if (result.veryShortDelay) {
        setVeryShortDelay(parseInt(result.veryShortDelay, 10));
      }
      if (result.shortDelay) {
        setShortDelay(parseInt(result.shortDelay, 10));
      }
      if (result.longDelay) {
        setLongDelay(parseInt(result.longDelay, 10));
      }
    });
  }, []);

  const handleSaveDelays = () => {
    chrome.storage.local.set({
      veryShortDelay: veryShortDelay.toString(),
      shortDelay: shortDelay.toString(),
      longDelay: longDelay.toString()
    }, () => {
      setStatus('Delay settings saved!');
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    });
  };

  return (
    <div className="delay-settings">
      <h2>Delay Settings</h2>
      
      <div className="form-group">
        <label htmlFor="very-short-delay">Very Short Delay (ms):</label>
        <input
          type="number"
          id="very-short-delay"
          value={veryShortDelay}
          onChange={(e) => setVeryShortDelay(parseInt(e.target.value) || 0)}
        />
        <small>
          Used for minor actions like clicks.
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="short-delay">Short Delay (ms):</label>
        <input
          type="number"
          id="short-delay"
          value={shortDelay}
          onChange={(e) => setShortDelay(parseInt(e.target.value) || 0)}
        />
        <small>
          Used between more significant steps.
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="long-delay">Long Delay (ms):</label>
        <input
          type="number"
          id="long-delay"
          value={longDelay}
          onChange={(e) => setLongDelay(parseInt(e.target.value) || 0)}
        />
        <small>
          Used for page loads or waiting for elements to appear.
        </small>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleSaveDelays}
      >
        Save Delays
      </button>
      
      {status && (
        <div className="status-message success">
          {status}
        </div>
      )}
      
      <div className="info-section">
        <h3>About Delay Settings</h3>
        <p>
          These settings control the time delays between various actions performed by the extension. 
          Adjusting these can help mimic human behavior and avoid potential issues with LinkedIn's detection mechanisms.
        </p>
        <p>
          <strong>Recommendation:</strong> It's generally recommended to keep these at their default values 
          unless you are an advanced user.
        </p>
      </div>
    </div>
  );
};

export default DelaySettings;