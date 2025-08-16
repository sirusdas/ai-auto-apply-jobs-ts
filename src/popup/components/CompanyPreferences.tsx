import React, { useState, useEffect } from 'react';

const CompanyPreferences: React.FC = () => {
  const [ignoreCompanies, setIgnoreCompanies] = useState<string>('');
  const [applyToProductCompanies, setApplyToProductCompanies] = useState<boolean>(true);
  const [applyToServiceCompanies, setApplyToServiceCompanies] = useState<boolean>(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['ignoreCompanies', 'applyToProductCompanies', 'applyToServiceCompanies'], (result) => {
      if (result.ignoreCompanies) {
        setIgnoreCompanies(result.ignoreCompanies);
      }
      
      if (result.applyToProductCompanies !== undefined) {
        setApplyToProductCompanies(result.applyToProductCompanies);
      } else {
        // Default to true if not set
        setApplyToProductCompanies(true);
        chrome.storage.local.set({ applyToProductCompanies: true });
      }
      
      if (result.applyToServiceCompanies !== undefined) {
        setApplyToServiceCompanies(result.applyToServiceCompanies);
      } else {
        // Default to true if not set
        setApplyToServiceCompanies(true);
        chrome.storage.local.set({ applyToServiceCompanies: true });
      }
    });
  }, []);

  const handleSaveIgnoreCompanies = () => {
    chrome.storage.local.set({ ignoreCompanies: ignoreCompanies.trim() }, () => {
      setStatus('Ignore companies list saved!');
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    });
  };

  const handleSaveCompanyPreferences = () => {
    chrome.storage.local.set({ 
      applyToProductCompanies: applyToProductCompanies,
      applyToServiceCompanies: applyToServiceCompanies
    }, () => {
      setStatus('Company preferences saved!');
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    });
  };

  return (
    <div className="company-preferences">
      <h2>Company Preferences</h2>
      
      <div className="form-group">
        <label htmlFor="ignore-companies">Companies to Ignore:</label>
        <textarea
          id="ignore-companies"
          value={ignoreCompanies}
          onChange={(e) => setIgnoreCompanies(e.target.value)}
          placeholder="Enter companies to ignore, separated by commas"
          rows={4}
        />
        <small>
          List any companies you want to avoid, separated by commas. The extension will skip applications to these companies.
        </small>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleSaveIgnoreCompanies}
      >
        Save Companies to Ignore
      </button>
      
      <div className="form-group" style={{ marginTop: '20px' }}>
        <h3>Company Type Preferences</h3>
        <p>Select which types of companies you want to apply to:</p>
        
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={applyToProductCompanies}
              onChange={(e) => setApplyToProductCompanies(e.target.checked)}
            />
            Product-based Companies
          </label>
          <small>
            Companies that create and sell their own products (e.g., Google, Microsoft).
          </small>
        </div>
        
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={applyToServiceCompanies}
              onChange={(e) => setApplyToServiceCompanies(e.target.checked)}
            />
            Service-based Companies
          </label>
          <small>
            Companies that provide services to other businesses (e.g., consulting firms, agencies).
          </small>
        </div>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleSaveCompanyPreferences}
      >
        Save Company Preferences
      </button>
      
      {status && (
        <div className="status-message success">
          {status}
        </div>
      )}
    </div>
  );
};

export default CompanyPreferences;