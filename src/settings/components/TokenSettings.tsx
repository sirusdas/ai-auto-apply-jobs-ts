import React, { useState, useEffect } from 'react';
import * as tokenService from '../../utils/tokenService';
import { TokenData } from '../../types';

const TokenSettings: React.FC = () => {
    const [token, setToken] = useState('');
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

    useEffect(() => {
        loadTokenInfo();
    }, []);

    const loadTokenInfo = async () => {
        setLoading(true);
        const existingToken = await tokenService.getToken();
        if (existingToken) {
            setToken(existingToken);
        }

        const data = await tokenService.getTokenData();
        setTokenData(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token.trim()) {
            setStatusMessage({ type: 'error', text: 'Please enter an API token' });
            return;
        }

        setValidating(true);
        setStatusMessage(null);

        try {
            // Get current token data to check if we have a valid token
            const currentTokenData = await tokenService.getTokenData();
            const isCurrentTokenValid = currentTokenData?.valid &&
                new Date(currentTokenData.expires_at).getTime() > Date.now();

            // Validate the new token
            const result = await tokenService.validateToken(0, token.trim(), 'save-token');

            // Special validation for initial token saving - check usage_count
            const isNewTokenFresh = result.data?.usage_count === 1;

            // If we have a valid current token and the new token is invalid, don't replace it
            if (isCurrentTokenValid && !result.valid) {
                setStatusMessage({
                    type: 'error',
                    text: 'Current token is still valid. New token is invalid and was not saved.'
                });
                setValidating(false);

                // Refresh the UI to show the current valid token status
                const refreshedTokenData = await tokenService.getTokenData();
                setTokenData(refreshedTokenData);
                return;
            }

            // If we're trying to save a token for the first time, it must be fresh (usage_count = 1)
            if ((!currentTokenData || !currentTokenData.valid) && result.valid && !isNewTokenFresh) {
                setStatusMessage({
                    type: 'error',
                    text: 'Token is valid but has been used before. Please use a fresh token.'
                });
                setValidating(false);
                return;
            }

            if (result.valid) {
                await tokenService.saveToken(token.trim());
                // Save the full token data
                chrome.storage.local.set({ [tokenService.TOKEN_DATA_KEY]: result.data });
                setTokenData(result.data);
                setStatusMessage({ type: 'success', text: 'Token saved and validated successfully!' });

                // Trigger page reload after a short delay to refresh status elsewhere if needed
                setTimeout(() => {
                    setStatusMessage(null);
                }, 3000);
            } else {
                setStatusMessage({ type: 'error', text: result.error || 'Invalid token or token already used' });

                // Refresh the UI to show the current token status
                const refreshedTokenData = await tokenService.getTokenData();
                setTokenData(refreshedTokenData);
            }
        } catch (error: any) {
            setStatusMessage({ type: 'error', text: error.message || 'Error saving token' });

            // Refresh the UI to show the current token status
            const refreshedTokenData = await tokenService.getTokenData();
            setTokenData(refreshedTokenData);
        } finally {
            setValidating(false);
        }
    };

    const handleClear = () => {
        if (window.confirm('Are you sure you want to clear the token? This action cannot be undone.')) {
            chrome.runtime.sendMessage({ action: 'clearToken' }, (response) => {
                if (response?.success) {
                    setToken('');
                    setTokenData(null);
                    setStatusMessage({ type: 'success', text: 'Token cleared successfully' });
                    setTimeout(() => setStatusMessage(null), 3000);
                }
            });
        }
    };

    const handleManualValidate = async () => {
        setValidating(true);
        setStatusMessage(null);
        try {
            const result = await tokenService.validateToken();
            if (result.valid) {
                setTokenData(result.data);
                setStatusMessage({ type: 'success', text: 'Token is valid' });
                // Save the updated token data
                chrome.storage.local.set({ [tokenService.TOKEN_DATA_KEY]: result.data });
            } else {
                // Update state to show token is invalid
                const updatedTokenData = tokenData ? {
                    ...tokenData,
                    valid: false,
                    last_error: { message: result.error || 'Token is invalid', timestamp: new Date().toISOString() }
                } : null;
                setTokenData(updatedTokenData);
                setStatusMessage({ type: 'error', text: result.error || 'Token is invalid' });
                // Update storage with invalid token data
                if (updatedTokenData) {
                    chrome.storage.local.set({ [tokenService.TOKEN_DATA_KEY]: updatedTokenData });
                }
            }
        } catch (error: any) {
            setStatusMessage({ type: 'error', text: error.message || 'Validation failed' });
        } finally {
            setValidating(false);
            setTimeout(() => setStatusMessage(null), 3000);
        }
    };

    const getExpiryInfo = () => {
        if (!tokenData?.expires_at) return null;
        const expiryDate = new Date(tokenData.expires_at);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            date: expiryDate.toLocaleDateString(),
            days: diffDays,
            isExpiringSoon: diffDays <= 7 && diffDays > 0,
            isExpired: diffDays <= 0
        };
    };

    const expiryInfo = getExpiryInfo();

    // Check if token is actually valid (not just present)
    const isTokenActuallyValid = tokenData?.valid &&
        new Date(tokenData.expires_at).getTime() > Date.now();

    if (loading) {
        return <div className="loading">Loading settings...</div>;
    }

    return (
        <div className="token-settings-enhanced">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                API Token Settings
                <button
                    className="info-button"
                    onClick={() => (window as any).showInfoModal('api-tokens')}
                    title="Learn about API tokens"
                >
                    ℹ️
                </button>
            </h2>
            <p className="description">
                Enter your API token to enable job matching, resume analysis, and other AI features.
                Don't have a token? <a href="https://qerds.com/tools/tgs" target="_blank" rel="noopener noreferrer">Get one here</a>.
            </p>

            <div className="card">
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label htmlFor="api-token">API Token:</label>
                        <div className="input-with-toggle">
                            <input
                                type={showToken ? "text" : "password"}
                                id="api-token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="••••••••••••••••••••••••••••••••"
                                disabled={validating}
                            />
                            <button
                                type="button"
                                className="toggle-visibility"
                                onClick={() => setShowToken(!showToken)}
                            >
                                {showToken ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                    </div>

                    <div className="actions">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={validating || !token}
                        >
                            {validating ? 'Validating...' : 'Save & Validate'}
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleManualValidate}
                            disabled={validating || !token}
                        >
                            Check Status
                        </button>

                        {/* <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleClear}
                            disabled={validating || !token}
                        >
                            Clear
                        </button> */}
                    </div>
                </form>

                {statusMessage && (
                    <div className={`status-message ${statusMessage.type}`}>
                        {statusMessage.text}
                    </div>
                )}
            </div>

            {tokenData && isTokenActuallyValid && (
                <div className="token-info card">
                    <h3>Current Token Status</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="label">Plan:</span>
                            <span className={`badge plan-${tokenData.planType.toLowerCase()}`}>
                                {tokenData.planType}
                            </span>
                        </div>

                        <div className="info-item">
                            <span className="label">Status:</span>
                            <span className="status-valid">✓ Active</span>
                        </div>

                        {expiryInfo && (
                            <div className="info-item">
                                <span className="label">Expires:</span>
                                <span className={expiryInfo.isExpiringSoon ? 'warning' : expiryInfo.isExpired ? 'error' : ''}>
                                    {expiryInfo.date} ({expiryInfo.days} days left)
                                </span>
                            </div>
                        )}

                        {/* <div className="info-item">
                            <span className="label">Usage:</span>
                            <span>{tokenData.usage_count} applications processed</span>
                        </div> */}

                        <div className="info-item">
                            <span className="label">Last Validated:</span>
                            <span>{new Date(tokenData.last_validated).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}

            {tokenData && !isTokenActuallyValid && (
                <div className="token-info error-card card">
                    <h3>Token Status: Invalid</h3>
                    <p>The current token is invalid or has expired. Please update your token to continue using all features.</p>
                    {tokenData.last_error && (
                        <p className="error-details">Error: {tokenData.last_error.message}</p>
                    )}
                    <a href="https://qerds.com/tools/tgs" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                        Renew Token
                    </a>
                </div>
            )}

            {!tokenData && token && !validating && (
                <div className="token-info error-card card">
                    <h3>Token Status: Not Validated</h3>
                    <p>Please validate your token to continue using all features.</p>
                    <button className="btn btn-primary" onClick={handleManualValidate}>
                        Validate Token
                    </button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .token-settings-enhanced .card {
          background: var(--surface-bg, #fff);
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .token-settings-enhanced .input-with-toggle {
          display: flex;
          gap: 10px;
        }
        .token-settings-enhanced .input-with-toggle input {
          flex: 1;
        }
        .token-settings-enhanced .toggle-visibility {
          background: none;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          padding: 0 10px;
        }
        .token-settings-enhanced .actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .token-settings-enhanced .status-message {
          margin-top: 15px;
          padding: 10px;
          border-radius: 4px;
        }
        .token-settings-enhanced .status-message.success { background: #e6fffa; color: #2c7a7b; border: 1px solid #81e6d9; }
        .token-settings-enhanced .status-message.error { background: #fff5f5; color: #c53030; border: 1px solid #feb2b2; }
        .token-settings-enhanced .status-message.warning { background: #fffaf0; color: #9c4221; border: 1px solid #fbd38d; }
        
        .token-settings-enhanced .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 10px;
        }
        .token-settings-enhanced .info-item {
          display: flex;
          flex-direction: column;
        }
        .token-settings-enhanced .info-item .label {
          font-size: 0.8em;
          color: #666;
          margin-bottom: 2px;
        }
        .token-settings-enhanced .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: bold;
          text-transform: uppercase;
        }
        .token-settings-enhanced .plan-pro { background: #ebf8ff; color: #2b6cb0; }
        .token-settings-enhanced .plan-enterprise { background: #faf5ff; color: #6b46c1; }
        .token-settings-enhanced .plan-free { background: #f7fafc; color: #4a5568; }
        
        .token-settings-enhanced .status-valid { color: #38a169; font-weight: bold; }
        .token-settings-enhanced .warning { color: #dd6b20; }
        .token-settings-enhanced .error { color: #e53e3e; }
        .token-settings-enhanced .error-details { color: #e53e3e; font-style: italic; }
        
        .token-settings-enhanced .error-card {
          border-left: 4px solid #e53e3e;
        }
      `}} />
        </div>
    );
};

export default TokenSettings;