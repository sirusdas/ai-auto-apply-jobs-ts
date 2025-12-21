import React, { useState, useEffect } from 'react';
import { AISettings, AIProvider } from '../../types';
import ModelSelector from './ModelSelector';

const AIProviderSettings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>({
    providers: [
      { id: 'gemini', name: 'Google Gemini', enabled: false, apiKey: '', model: 'gemma-3-27b-it', priority: 1 },
      { id: 'claude', name: 'Anthropic Claude', enabled: false, apiKey: '', model: 'claude-3-5-sonnet-20241022', priority: 2 },
      { id: 'openai', name: 'OpenAI ChatGPT', enabled: false, apiKey: '', model: 'gpt-4o', priority: 3 }
    ],
    primaryProvider: 'gemini',
    enableFallback: false,
    timeout: 30000
  });

  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['aiSettings'], (result) => {
      if (result.aiSettings) {
        setSettings(result.aiSettings);
      }
    });
  }, []);

  const handleProviderChange = (id: string, field: keyof AIProvider, value: any) => {
    const updatedProviders = settings.providers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setSettings({ ...settings, providers: updatedProviders });
  };

  const handleSave = () => {
    chrome.storage.local.set({ aiSettings: settings }, () => {
      setStatus({ type: 'success', message: 'AI settings saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    });
  };

  return (
    <div className="ai-provider-settings">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        AI Provider Settings
        <button
          className="info-button"
          onClick={() => (window as any).showInfoModal('ai-provider-selection')}
          title="Learn about AI providers"
        >
          ℹ️
        </button>
      </h2>

      <div className="global-settings card">
        <h3>Global Settings</h3>
        <div className="form-group">
          <label htmlFor="primary-provider">Primary AI Provider:</label>
          <select
            id="primary-provider"
            value={settings.primaryProvider}
            onChange={(e) => setSettings({ ...settings, primaryProvider: e.target.value })}
          >
            {settings.providers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.enableFallback}
              onChange={(e) => setSettings({ ...settings, enableFallback: e.target.checked })}
            />
            Enable Automatic Fallback (Try other enabled providers if primary fails)
          </label>
        </div>
      </div>

      <div className="providers-list">
        {settings.providers.map(provider => (
          <div key={provider.id} className={`provider-card card ${provider.enabled ? 'enabled' : 'disabled'}`}>
            <div className="provider-header">
              <h3>{provider.name}</h3>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={(e) => handleProviderChange(provider.id, 'enabled', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {provider.enabled && (
              <div className="provider-details">
                <div className="form-group">
                  <label htmlFor={`${provider.id}-api-key`}>API Key:</label>
                  <input
                    type="password"
                    id={`${provider.id}-api-key`}
                    value={provider.apiKey}
                    onChange={(e) => handleProviderChange(provider.id, 'apiKey', e.target.value)}
                    placeholder={`Enter ${provider.name} API Key`}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`${provider.id}-model`}>Model:</label>
                  <ModelSelector
                    providerId={provider.id}
                    selectedModel={provider.model || ''}
                    onModelChange={(model) => handleProviderChange(provider.id, 'model', model)}
                    disabled={!provider.enabled}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`${provider.id}-priority`}>Priority (Lower is higher):</label>
                  <input
                    type="number"
                    id={`${provider.id}-priority`}
                    value={provider.priority}
                    onChange={(e) => handleProviderChange(provider.id, 'priority', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="notice-card card warning-notice">
        <div className="notice-header">
          <span className="notice-icon">⚠️</span>
          <h3>Important Notice About Paid Models</h3>
        </div>
        <div className="notice-content">
          <p>Many AI models listed here require paid subscriptions or API credits:</p>
          <ul>
            <li><strong>Free models</strong> (like Gemini Flash/Pro) are clearly marked and can be used immediately with a free API key.</li>
            <li><strong>Paid models</strong> (Claude, GPT-4o, etc.) require you to purchase API access directly from the provider.</li>
            <li>This extension <strong>does not</strong> provide or pay for AI API access.</li>
            <li>Please ensure you have active API credits before selecting a paid model.</li>
          </ul>
          <div className="pricing-links">
            <p><strong>Official Pricing Pages:</strong></p>
            <div className="links-grid">
              <a href="https://ai.google.dev/pricing" target="_blank" rel="noreferrer">Google Gemini</a>
              <a href="https://www.anthropic.com/pricing" target="_blank" rel="noreferrer">Anthropic Claude</a>
              <a href="https://openai.com/api/pricing" target="_blank" rel="noreferrer">OpenAI GPT</a>
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn-primary" onClick={handleSave}>
          Save All AI Settings
        </button>
      </div>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .card {
          background: var(--card-bg, #fff);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .warning-notice {
          border-left: 4px solid #f59e0b;
          background: #fffbeb;
        }
        .notice-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .notice-header h3 {
          margin: 0;
          color: #92400e;
          font-size: 1.1em;
        }
        .notice-icon {
          font-size: 1.2em;
        }
        .notice-content {
          font-size: 0.9em;
          color: #92400e;
          line-height: 1.5;
        }
        .notice-content ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .pricing-links {
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid #fde68a;
        }
        .links-grid {
          display: flex;
          gap: 15px;
          margin-top: 5px;
        }
        .links-grid a {
          color: #2196F3;
          text-decoration: none;
          font-weight: 500;
        }
        .links-grid a:hover {
          text-decoration: underline;
        }
        .provider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        .provider-card.disabled {
          opacity: 0.7;
        }
        .provider-details {
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc; transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute; content: "";
          height: 18px; width: 18px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: #2196F3; }
        input:checked + .slider:before { transform: translateX(26px); }
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9em;
        }
        .actions {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .btn-primary {
          background-color: #2196F3;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-primary:hover {
          background-color: #1976D2;
        }
        .status-message {
          margin-top: 15px;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
        }
        .status-message.success {
          background-color: #dcfce7;
          color: #166534;
        }
      `}} />
    </div>
  );
};

export default AIProviderSettings;
