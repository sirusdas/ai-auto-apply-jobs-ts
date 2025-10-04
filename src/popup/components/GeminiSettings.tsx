import React, { useState, useEffect } from 'react';

const GeminiSettings: React.FC = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash-lite');
  const [useCustomAI, setUseCustomAI] = useState(false);
  const [aiServerUrl, setAiServerUrl] = useState('https://qerds.com/tools/tgs/api/analyze-job');

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(['geminiApiKey', 'geminiModel', 'useCustomAI', 'aiServerUrl'], (result) => {
      console.log('Loaded settings from storage:', result);
      if (result.hasOwnProperty('geminiApiKey')) {
        console.log('Setting geminiApiKey state to:', result.geminiApiKey);
        setGeminiApiKey(result.geminiApiKey);
      }
      if (result.geminiModel) {
        console.log('Setting geminiModel state to:', result.geminiModel);
        setGeminiModel(result.geminiModel);
      }
      if (result.useCustomAI !== undefined) {
        console.log('Setting useCustomAI state to:', result.useCustomAI);
        setUseCustomAI(result.useCustomAI);
      }
      if (result.aiServerUrl) {
        console.log('Setting aiServerUrl state to:', result.aiServerUrl);
        setAiServerUrl(result.aiServerUrl);
      }
    });
  }, []);

  const saveSettings = () => {
    const settingsToSave = {
      geminiApiKey,
      geminiModel,
      useCustomAI,
      aiServerUrl
    };
    
    console.log('Current state values:');
    console.log('- geminiApiKey:', geminiApiKey);
    console.log('- geminiModel:', geminiModel);
    console.log('- useCustomAI:', useCustomAI);
    console.log('- aiServerUrl:', aiServerUrl);
    
    console.log('Saving settings to storage:', settingsToSave);
    chrome.storage.local.set(settingsToSave, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
      } else {
        console.log('Settings saved successfully');
        // Verify that settings were actually saved
        chrome.storage.local.get(['geminiApiKey', 'geminiModel', 'useCustomAI', 'aiServerUrl', 'minMatchScore'], (result) => {
          console.log('Verification - Retrieved settings after saving:', result);
          console.log('Verification - Keys in result:', Object.keys(result));
        });
      }
      alert('Settings saved!');
    });
  };

  return (
    <div className="accordion">
      <h2>Gemini API Settings</h2>
      <div className="form-group">
        <label htmlFor="geminiApiKey">Gemini API Key:</label>
        <input
          type="password"
          id="geminiApiKey"
          value={geminiApiKey}
          onChange={(e) => setGeminiApiKey(e.target.value)}
          placeholder="Enter your Gemini API key"
        />
        <small>
          Get your API key from{' '}
          <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
            Google AI Studio
          </a>
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="geminiModel">Gemini Model:</label>
        <select
          id="geminiModel"
          value={geminiModel}
          onChange={(e) => setGeminiModel(e.target.value)}
        >
          <option value="gemini-2.0-flash-lite">Gemini Pro</option>
          <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro</option>
          <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash</option>
        </select>
      </div>

      <div className="form-group">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={useCustomAI}
            onChange={(e) => setUseCustomAI(e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">Use Custom AI API (Premium Feature)</span>
        </label>
      </div>

      {useCustomAI && (
        <div className="form-group">
          <label htmlFor="aiServerUrl">Custom AI Server URL:</label>
          <input
            type="text"
            id="aiServerUrl"
            value={aiServerUrl}
            onChange={(e) => setAiServerUrl(e.target.value)}
            placeholder="Enter custom AI server URL"
          />
        </div>
      )}

      <button className="save-button" onClick={saveSettings}>
        Save Settings
      </button>
    </div>
  );
};

export default GeminiSettings;