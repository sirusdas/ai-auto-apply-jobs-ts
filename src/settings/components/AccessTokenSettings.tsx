import React, { useState, useEffect } from 'react';
import { AISettings } from '../../types';

const AccessTokenSettings: React.FC = () => {
  const [accessToken, setAccessToken] = useState('');
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    // Load AI settings and get the gemini provider's API key
    chrome.storage.local.get(['aiSettings'], (result) => {
      const aiSettings: AISettings = result.aiSettings;
      if (aiSettings) {
        const geminiProvider = aiSettings.providers.find(p => p.id === 'gemini');
        if (geminiProvider) {
          setAccessToken(geminiProvider.apiKey);
        }
      }
    });
  }, []);

  const handleSave = () => {
    if (!accessToken.trim()) {
      setStatus({ type: 'error', message: 'Please enter an access token.' });
      return;
    }

    // Load existing settings and update the gemini provider's API key
    chrome.storage.local.get(['aiSettings'], (result) => {
      let aiSettings: AISettings = result.aiSettings || {
        providers: [
          { id: 'gemini', name: 'Google Gemini', enabled: false, apiKey: '', model: 'gemma-3-27b-it', priority: 1 },
          { id: 'claude', name: 'Anthropic Claude', enabled: false, apiKey: '', model: 'claude-3-5-sonnet-20241022', priority: 2 },
          { id: 'openai', name: 'OpenAI ChatGPT', enabled: false, apiKey: '', model: 'gpt-4o', priority: 3 }
        ],
        primaryProvider: 'gemini',
        enableFallback: false,
        timeout: 30000
      };

      // Update the gemini provider's API key
      const updatedProviders = aiSettings.providers.map(p => 
        p.id === 'gemini' ? { ...p, apiKey: accessToken.trim() } : p
      );
      
      // If gemini provider doesn't exist, add it
      if (!aiSettings.providers.some(p => p.id === 'gemini')) {
        updatedProviders.push({
          id: 'gemini',
          name: 'Google Gemini',
          enabled: false,
          apiKey: accessToken.trim(),
          model: 'gemma-3-27b-it',
          priority: 1
        });
      }

      const updatedSettings = { ...aiSettings, providers: updatedProviders };
      
      chrome.storage.local.set({ aiSettings: updatedSettings }, () => {
        setStatus({ type: 'success', message: 'Access token saved successfully!' });
        setTimeout(() => setStatus(null), 3000);
      });
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