import React, { useState, useEffect } from 'react';

const ModeToggles: React.FC = () => {
  const [developerMode, setDeveloperMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['developerMode', 'darkMode'], (result) => {
      if (result.developerMode !== undefined) {
        setDeveloperMode(result.developerMode);
      }
      if (result.darkMode !== undefined) {
        setDarkMode(result.darkMode);
      }
    });
  }, []);

  const handleDeveloperModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setDeveloperMode(isEnabled);
    chrome.storage.local.set({ developerMode: isEnabled });
    
    // Toggle visibility of developer-only elements
    const developerElements = document.querySelectorAll('.developer-only');
    developerElements.forEach(element => {
      if (isEnabled) {
        (element as HTMLElement).style.display = 'block';
      } else {
        (element as HTMLElement).style.display = 'none';
      }
    });
  };

  const handleDarkModeToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isEnabled = e.target.checked;
    setDarkMode(isEnabled);
    chrome.storage.local.set({ darkMode: isEnabled });
    
    // Apply dark mode to the page
    if (isEnabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const handleDemoClick = () => {
    // Fill form fields with demo data
    chrome.storage.local.set({
      apiToken: 'demo_api_token_12345',
      accessToken: 'demo_access_token_67890',
      FirstName: 'John',
      LastName: 'Doe',
      PhoneNumber: '+1234567890',
      City: 'San Francisco',
      Email: 'john.doe@example.com',
      YearsOfExperience: '5',
      plainTextResume: 'John Doe\nSoftware Engineer with 5 years of experience...',
      ignoreCompanies: 'Company A, Company B, Company C',
      applyToProductCompanies: true,
      applyToServiceCompanies: true,
      veryShortDelay: '1000',
      shortDelay: '5000',
      longDelay: '7000',
      minMatchScore: '3'
    }, () => {
      // Show success message
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = 'Demo data loaded successfully!';
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 3000);
      }
      
      // Reload the current component to show the new data
      window.location.reload();
    });
  };

  return (
    <>
      <button id="demoButton" className="demo-button" onClick={handleDemoClick}>
        DEMO
      </button>
      
      <div className="toggles-container">
        <div id="current-mode-display" style={{ marginRight: 'auto', fontWeight: 'bold' }}>
          {developerMode ? 'Developer Mode: ON' : 'Developer Mode: OFF'}
        </div>
        <div className="toggle-switch-container">
          <span className="toggle-label">Developer Mode</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              id="developerModeToggle" 
              checked={developerMode}
              onChange={handleDeveloperModeToggle}
            />
            <span className="slider"></span>
          </label>
        </div>
        <div className="toggle-switch-container">
          <span className="toggle-label">Dark Mode</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              id="darkModeToggle" 
              checked={darkMode}
              onChange={handleDarkModeToggle}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </>
  );
};

export default ModeToggles;