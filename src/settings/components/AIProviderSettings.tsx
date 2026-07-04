import React, { useState, useEffect } from 'react';
import { AISettings, AIProvider } from '../../types';
import ModelSelector from './ModelSelector';
import { fetchProviderModels, getBestDefaultModel } from '../../utils/modelFetcher';

const AIProviderSettings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>({
    providers: [
      { id: 'gemini', name: 'Google Gemini', enabled: false, apiKey: '', model: 'gemini-2.0-flash', priority: 1 },
      { id: 'claude', name: 'Anthropic Claude', enabled: false, apiKey: '', model: 'claude-3-5-sonnet-20241022', priority: 2 },
      { id: 'openai', name: 'OpenAI ChatGPT', enabled: false, apiKey: '', model: 'gpt-4o', priority: 3 }
    ],
    primaryProvider: 'gemini',
    enableFallback: false,
    timeout: 30000,
    maxRetries: 3,
    pauseAfterRetries: false,
    pauseDuration: 30
  });

  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    chrome.storage.local.get(['aiSettings'], (result) => {
      if (result.aiSettings) {
        setSettings(result.aiSettings);
      }
    });

    // Listen for changes from background model recovery
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.aiSettings) {
        console.log('AIProviderSettings: Syncing with background storage changes...');
        setSettings(changes.aiSettings.newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleProviderChange = (id: string, field: keyof AIProvider, value: any) => {
    const updatedProviders = settings.providers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setSettings({ ...settings, providers: updatedProviders });
  };

  const handleApiKeyBlur = async (providerId: string, apiKey: string) => {
    if (!apiKey) return;
    
    setIsVerifying(prev => ({ ...prev, [providerId]: true }));
    setStatus({ type: 'info', message: `Verifying ${providerId} API key and fetching models...` });

    try {
      const provider = settings.providers.find(p => p.id === providerId);
      if (!provider) return;
      const providerWithKey = { ...provider, apiKey };
      
      const models = await fetchProviderModels(providerWithKey);
      if (models && models.length > 0) {
        const bestModelId = getBestDefaultModel(models, providerId);
        
        // Update both the api key (already updated via onChange but we ensure it) and the model
        const updatedProviders = settings.providers.map(p => {
          if (p.id === providerId) {
            return { ...p, apiKey, model: bestModelId };
          }
          return p;
        });
        
        setSettings(prev => ({ ...prev, providers: updatedProviders }));
        setStatus({ type: 'success', message: `Verified! Auto-selected best model: ${bestModelId}` });
      } else {
        setStatus({ type: 'warning', message: `Could not fetch models for ${providerId}. Check API key.` });
      }
    } catch (error) {
      console.error(`Error verifying ${providerId} key:`, error);
      setStatus({ type: 'error', message: `Verification failed for ${providerId}. Check API key.` });
    } finally {
      setIsVerifying(prev => ({ ...prev, [providerId]: false }));
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handleAddCustomProvider = () => {
    const newId = `custom-${Date.now()}`;
    setSettings({
      ...settings,
      providers: [
        ...settings.providers,
        {
          id: newId,
          name: 'Custom Provider (OpenRouter/Local)',
          enabled: true,
          apiKey: '',
          model: '',
          priority: settings.providers.length + 1,
          isCustom: true,
          baseUrl: 'https://openrouter.ai/api/v1'
        }
      ]
    });
  };

  const handleRemoveCustomProvider = (id: string) => {
    setSettings({
      ...settings,
      providers: settings.providers.filter(p => p.id !== id),
      primaryProvider: settings.primaryProvider === id ? 'gemini' : settings.primaryProvider
    });
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

        <div className="form-group">
          <label htmlFor="max-retries">Max AI Retries Before Action:</label>
          <input
            type="number"
            id="max-retries"
            value={settings.maxRetries ?? 3}
            onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) || 3 })}
            min="1"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.tryOtherFreeModels ?? true}
              onChange={(e) => setSettings({ ...settings, tryOtherFreeModels: e.target.checked })}
            />
            Try other free models if max retries limit is hit
          </label>
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.pauseAfterRetries ?? false}
              onChange={(e) => setSettings({ ...settings, pauseAfterRetries: e.target.checked })}
            />
            Pause and Resume Instead of Stopping after Max Retries
          </label>
        </div>

        {(settings.pauseAfterRetries ?? false) && (
          <div className="form-group">
            <label htmlFor="pause-duration">Pause Duration (minutes):</label>
            <input
              type="number"
              id="pause-duration"
              value={settings.pauseDuration ?? 30}
              onChange={(e) => setSettings({ ...settings, pauseDuration: parseInt(e.target.value) || 30 })}
              min="1"
            />
          </div>
        )}

        <hr style={{ margin: '20px 0', border: '0', borderTop: '1px solid #eee' }} />
        <h4>JD Compression Optimization (Save Tokens)</h4>
        
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.enableJdCompression ?? false}
              onChange={(e) => setSettings({ ...settings, enableJdCompression: e.target.checked })}
            />
            Enable Job Description Compression (Highly Recommended)
          </label>
        </div>

        {(settings.enableJdCompression) && (
          <>
            <div className="form-group">
              <label htmlFor="compression-method">Compression Method:</label>
              <select
                id="compression-method"
                value={settings.jdCompressionMethod || 'regex'}
                onChange={(e) => setSettings({ ...settings, jdCompressionMethod: e.target.value as any })}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="regex">Fast Regex Trimming (Removes EEO/Benefits boilerplate - 0s delay)</option>
                <option value="local_ai">Local Chrome AI (window.ai - 100% Free & Fast)</option>
                <option value="cheap_api">Cheap API (Use a fast/cheap secondary AI to compress)</option>
              </select>
            </div>
            
            {(settings.jdCompressionMethod === 'cheap_api') && (
              <div className="form-group">
                <label htmlFor="compression-provider">Secondary Provider for Compression:</label>
                <select
                  id="compression-provider"
                  value={settings.jdCompressionProviderId || ''}
                  onChange={(e) => setSettings({ ...settings, jdCompressionProviderId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Provider --</option>
                  {settings.providers.filter(p => p.enabled).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.model || 'Default'})</option>
                  ))}
                </select>
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  Select a very cheap or free provider (like Gemini Flash or a Local LLM) to do the compression before sending to your primary expensive model.
                </small>
              </div>
            )}
          </>
        )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label htmlFor={`${provider.id}-api-key`} style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                      API Key:
                      <button
                        className="help-icon-small"
                        onClick={() => (window as any).showInfoModal(`${provider.id}-help`)}
                        title={`Help - How to get ${provider.name} API Key`}
                        type="button"
                      >
                        ❓
                      </button>
                    </label>
                    {!provider.apiKey && (
                      <a
                        href={
                          provider.id === 'gemini' ? 'https://aistudio.google.com/app/apikey' :
                            provider.id === 'claude' ? 'https://console.anthropic.com/settings/keys' :
                              'https://platform.openai.com/api-keys'
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="get-key-link"
                      >
                        Get {provider.name} Key
                      </a>
                    )}
                  </div>
                  <input
                    type="password"
                    id={`${provider.id}-api-key`}
                    value={provider.apiKey}
                    onChange={(e) => handleProviderChange(provider.id, 'apiKey', e.target.value)}
                    onBlur={(e) => handleApiKeyBlur(provider.id, e.target.value)}
                    placeholder={`Enter ${provider.name} API Key`}
                    disabled={isVerifying[provider.id]}
                  />
                  {isVerifying[provider.id] && <span className="verifying-text">Verifying...</span>}
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
                {provider.isCustom && (
                  <>
                    <div className="form-group">
                      <label htmlFor={`${provider.id}-name`}>Provider Name:</label>
                      <input
                        type="text"
                        id={`${provider.id}-name`}
                        value={provider.name}
                        onChange={(e) => handleProviderChange(provider.id, 'name', e.target.value)}
                        placeholder="e.g. OpenRouter, LM Studio"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`${provider.id}-baseUrl`}>Base URL (OpenAI-compatible):</label>
                      <input
                        type="text"
                        id={`${provider.id}-baseUrl`}
                        value={provider.baseUrl || ''}
                        onChange={(e) => handleProviderChange(provider.id, 'baseUrl', e.target.value)}
                        placeholder="e.g. https://openrouter.ai/api/v1 or http://localhost:11434/v1"
                      />
                    </div>
                    <button 
                      onClick={() => handleRemoveCustomProvider(provider.id)}
                      className="btn-remove"
                      style={{ marginTop: '10px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Remove Provider
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button 
            onClick={handleAddCustomProvider}
            className="btn-secondary"
            style={{ padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
          >
            + Add Custom Provider (OpenRouter, Local LLMs, etc)
          </button>
        </div>
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
        .help-icon-small {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9em;
          padding: 0;
          margin: 0;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .help-icon-small:hover {
          opacity: 1;
        }
        .get-key-link {
          font-size: 0.8em;
          color: #2196F3;
          text-decoration: none;
          font-weight: 500;
          padding: 2px 8px;
          border: 1px solid #2196F3;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .get-key-link:hover {
          background: #2196F3;
          color: white;
          text-decoration: none;
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
        .status-message.info {
          background-color: #e0f2fe;
          color: #0369a1;
        }
        .status-message.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .status-message.warning {
          background-color: #fef08a;
          color: #854d0e;
        }
        .verifying-text {
          font-size: 0.8em;
          color: #2196F3;
          margin-left: 8px;
          font-style: italic;
        }
      `}} />
    </div>
  );
};

export default AIProviderSettings;
