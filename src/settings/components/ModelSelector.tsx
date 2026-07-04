import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS, ModelInfo } from '../../constants/aiModels';
import { fetchProviderModels } from '../../utils/modelFetcher';
import { AIProvider } from '../../types';

interface ModelSelectorProps {
    providerId: string;
    selectedModel: string;
    onModelChange: (model: string) => void;
    disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ providerId, selectedModel, onModelChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [dynamicModels, setDynamicModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [useDynamicModels, setUseDynamicModels] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const staticModels = AI_MODELS[providerId] || [];

    // Check if current model is one of the presets
    const isPresetModel = staticModels.some(m => m.id === selectedModel);

    useEffect(() => {
        if (!isPresetModel && selectedModel && !isCustomMode) {
            setIsCustomMode(true);
        }
    }, [selectedModel, isPresetModel]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load dynamic models when switching to dynamic mode or on mount
    useEffect(() => {
        if (!disabled) {
            loadDynamicModels();
        }
    }, [providerId, disabled]);

    // Load dynamic models from API
    const loadDynamicModels = async () => {
        setIsLoading(true);
        try {
            // Get API key from localStorage to fetch models
            const storedSettings = await chrome.storage.local.get(['aiSettings']);
            const aiSettings = storedSettings.aiSettings;
            
            if (aiSettings && aiSettings.providers) {
                const provider = aiSettings.providers.find((p: AIProvider) => p.id === providerId);
                
                if (provider && (provider.apiKey || provider.isCustom)) {
                    const models = await fetchProviderModels(provider);
                    setDynamicModels(models);
                    setUseDynamicModels(true);
                } else {
                    // If no API key is available, fall back to static models
                    setDynamicModels(staticModels);
                    setUseDynamicModels(true);
                }
            } else {
                // If no settings are available, fall back to static models
                setDynamicModels(staticModels);
                setUseDynamicModels(true);
            }
        } catch (error) {
            console.error(`Error fetching ${providerId} models:`, error);
            // Fall back to static models if there's an error
            setDynamicModels(staticModels);
            setUseDynamicModels(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshClick = () => {
        loadDynamicModels();
    };

    const modelsToUse = useDynamicModels ? dynamicModels : staticModels;

    const filteredModels = modelsToUse.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleSelect = (modelId: string) => {
        setIsCustomMode(false);
        onModelChange(modelId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onModelChange(e.target.value);
    };

    const selectedModelInfo = modelsToUse.find(m => m.id === selectedModel);

    return (
        <div className="model-selector" ref={dropdownRef}>
            {isCustomMode ? (
                <div className="custom-model-input-wrapper">
                    <input
                        type="text"
                        value={selectedModel}
                        onChange={handleCustomChange}
                        placeholder="Enter custom model name..."
                        className="custom-model-input"
                        disabled={disabled}
                    />
                    <button
                        className="btn-text"
                        onClick={() => { setIsCustomMode(false); setSearchTerm(''); }}
                        title="Back to list"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div
                    className={`model-selector-trigger ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <div className="selected-model-info">
                        <span className="model-name">{selectedModelInfo?.name || selectedModel || 'Select a model'}</span>
                        {selectedModelInfo?.isPaid && <span className="badge paid">PAID</span>}
                        {selectedModelInfo?.tier === 'free' && <span className="badge free">FREE</span>}
                    </div>
                    <div className="trigger-controls">
                        <button 
                            className="refresh-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRefreshClick();
                            }}
                            title="Refresh models from API"
                            disabled={isLoading}
                        >
                            {isLoading ? '🔄' : '🔄'}
                        </button>
                        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
                    </div>
                </div>
            )}

            {isOpen && !isCustomMode && (
                <div className="model-dropdown">
                    <div className="dropdown-controls">
                        <div className="dropdown-search">
                            <input
                                type="text"
                                placeholder="Search models..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="controls-right">
                            <button 
                                className="refresh-btn-small"
                                onClick={handleRefreshClick}
                                title="Refresh models from API"
                                disabled={isLoading}
                            >
                                {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
                            </button>
                            <button 
                                className={`mode-toggle ${useDynamicModels ? 'active' : ''}`}
                                onClick={loadDynamicModels}
                                title={useDynamicModels ? "Switch to default models" : "Load models from API"}
                                disabled={isLoading}
                            >
                                {useDynamicModels ? '🌐 API' : '📦 Default'}
                            </button>
                        </div>
                    </div>
                    <div className="dropdown-options">
                        {isLoading && (
                            <div className="loading-indicator">
                                Loading models from {providerId.charAt(0).toUpperCase() + providerId.slice(1)} API...
                            </div>
                        )}
                        {!isLoading && filteredModels.length === 0 && (
                            <div className="no-results">
                                No models found matching "{searchTerm}"
                            </div>
                        )}
                        {!isLoading && filteredModels.map(model => (
                            <div
                                key={model.id}
                                className={`model-option ${selectedModel === model.id ? 'active' : ''}`}
                                onClick={() => handleSelect(model.id)}
                            >
                                <div className="option-header">
                                    <span className="option-name">{model.name}</span>
                                    {model.isPaid ? <span className="badge paid">PAID</span> : <span className="badge free">FREE</span>}
                                </div>
                                <div className="option-meta">
                                    <span className="option-id">{model.id}</span>
                                    {model.contextWindow && <span className="option-context"> • {model.contextWindow}</span>}
                                </div>
                                <div className="option-description">{model.description}</div>
                                {model.pricing && <div className="option-pricing">{model.pricing}</div>}
                            </div>
                        ))}
                        <div
                            className="model-option custom-trigger"
                            onClick={() => { setIsCustomMode(true); setIsOpen(false); }}
                        >
                            <span className="plus">+</span> Use custom model name
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .model-selector {
                    position: relative;
                    width: 100%;
                }
                .model-selector-trigger {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: border-color 0.2s;
                }
                .model-selector-trigger:hover:not(.disabled) {
                    border-color: #2196F3;
                }
                .model-selector-trigger.disabled {
                    background: #f5f5f5;
                    cursor: not-allowed;
                    opacity: 0.7;
                }
                .selected-model-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    overflow: hidden;
                    flex: 1;
                }
                .model-name {
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .trigger-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .refresh-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    padding: 0;
                    margin-right: 5px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                .refresh-btn:hover {
                    opacity: 1;
                }
                .refresh-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .badge.paid { background: #fee2e2; color: #ef4444; }
                .badge.free { background: #dcfce7; color: #22c55e; }
                
                .model-dropdown {
                    position: absolute;
                    top: calc(100% + 5px);
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 1000;
                    max-height: 400px;
                    display: flex;
                    flex-direction: column;
                }
                .dropdown-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    gap: 10px;
                }
                .dropdown-search {
                    flex: 1;
                }
                .dropdown-search input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .controls-right {
                    display: flex;
                    gap: 8px;
                }
                .refresh-btn-small {
                    background: #f0f7ff;
                    border: 1px solid #2196F3;
                    border-radius: 4px;
                    padding: 5px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .refresh-btn-small:hover:not(:disabled) {
                    background: #e3f2fd;
                }
                .refresh-btn-small:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .mode-toggle {
                    background: #f0f7ff;
                    border: 1px solid #2196F3;
                    border-radius: 4px;
                    padding: 5px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .mode-toggle:hover:not(:disabled) {
                    background: #e3f2fd;
                }
                .mode-toggle.active {
                    background: #2196F3;
                    color: white;
                }
                .mode-toggle:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .dropdown-options {
                    overflow-y: auto;
                    flex: 1;
                }
                .model-option {
                    padding: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-bottom: 1px solid #f9f9f9;
                }
                .model-option:hover {
                    background: #f0f7ff;
                }
                .model-option.active {
                    background: #e3f2fd;
                    border-left: 3px solid #2196F3;
                }
                .option-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .option-name {
                    font-weight: 600;
                    font-size: 14px;
                }
                .option-meta {
                    font-size: 11px;
                    color: #666;
                    margin-bottom: 4px;
                }
                .option-description {
                    font-size: 12px;
                    color: #444;
                    line-height: 1.4;
                }
                .option-pricing {
                    font-size: 11px;
                    color: #2196F3;
                    margin-top: 4px;
                    font-weight: 500;
                }
                .custom-trigger {
                    text-align: center;
                    color: #2196F3;
                    font-weight: 500;
                    padding: 15px;
                    border-top: 1px solid #eee;
                }
                .custom-model-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .custom-model-input {
                    flex: 1;
                    padding: 10px 12px;
                    border: 1px solid #2196F3;
                    border-radius: 6px;
                    font-size: 14px;
                }
                .btn-text {
                    background: none;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 18px;
                    padding: 4px 8px;
                }
                .btn-text:hover { color: #ef4444; }
                .plus { font-size: 18px; vertical-align: middle; margin-right: 4px; }
                .loading-indicator, .no-results {
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
            `}} />
        </div>
    );
};

export default ModelSelector;