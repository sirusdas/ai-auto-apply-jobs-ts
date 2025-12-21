import React, { useState, useEffect } from 'react';

const TokenSettings: React.FC = () => {
  const [apiToken, setApiToken] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{ email?: string; expiry?: string }>({});
  const [tokenStatus, setTokenStatus] = useState<{ isValid?: boolean; error?: string }>({});

  useEffect(() => {
    // Load saved API token
    chrome.storage.local.get(['apiToken'], (result) => {
      if (result.apiToken) {
        setApiToken(result.apiToken);
        decodeToken(result.apiToken);
      }
    });
  }, []);

  const decodeToken = (token: string) => {
    if (!token || token.trim() === '') {
      setTokenInfo({});
      setTokenStatus({
        isValid: false,
        error: 'Token is required'
      });
      return;
    }

    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        // Not a JWT format, but could be a valid simple API key
        setTokenInfo({});
        setTokenStatus({
          isValid: true,
          error: undefined
        });
        return;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed
      const paddedPayload = payload.padEnd(payload.length + (4 - payload.length % 4) % 4, '=');

      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      setTokenInfo({
        email: payloadObj.email || payloadObj.sub || 'Unknown',
        expiry: new Date(payloadObj.exp * 1000).toLocaleString()
      });

      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      setTokenStatus({
        isValid: payloadObj.exp > currentTime,
        error: payloadObj.exp <= currentTime ? 'Token has expired' : undefined
      });
    } catch (error) {
      console.error('Error decoding token:', error);
      // If it looks like a JWT but fails to decode, fallback to treating it as a simple token
      setTokenInfo({});
      setTokenStatus({
        isValid: true,
        error: undefined
      });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    chrome.storage.local.set({ apiToken }, () => {
      // Show success message
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = 'API token saved successfully!';
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 3000);
      }

      // Decode and validate the token
      decodeToken(apiToken);
    });
  };

  return (
    <div className="token-settings">
      <h2>API Token Settings</h2>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="apiToken">API Token:</label>
          <input
            type="password"
            id="apiToken"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Enter your API token"
          />
        </div>

        {tokenStatus.error && (
          <div className="token-status error">
            <strong>Error:</strong> {tokenStatus.error}
          </div>
        )}

        {tokenStatus.isValid && (
          <div className="token-status valid">
            <strong>Token is valid</strong>
            {tokenInfo.email && <p>Email: {tokenInfo.email}</p>}
            {tokenInfo.expiry && <p>Expires: {tokenInfo.expiry}</p>}
          </div>
        )}

        <button type="submit" className="btn btn-primary">Save Token</button>
      </form>
    </div>
  );
};

export default TokenSettings;