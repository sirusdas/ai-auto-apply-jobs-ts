import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS, ModelInfo } from '../../constants/aiModels';

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
    const dropdownRef = useRef<HTMLDivElement>(null);

    const models = AI_MODELS[providerId] || [];

    // Check if current model is one of the presets
    const isPresetModel = models.some(m => m.id === selectedModel);

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

    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase())
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

    const selectedModelInfo = models.find(m => m.id === selectedModel);

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
                    <span className="arrow">{isOpen ? '▲' : '▼'}</span>
                </div>
            )}

            {isOpen && !isCustomMode && (
                <div className="model-dropdown">
                    <div className="dropdown-search">
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="dropdown-options">
                        {filteredModels.map(model => (
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
                }
                .model-name {
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
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
                .dropdown-search {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                }
                .dropdown-search input {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
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
            `}} />
        </div>
    );
};

export default ModelSelector;
