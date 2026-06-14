import React, { useState } from 'react';

interface DemoButtonProps {
    onStartDemo: () => void;
}

export const DemoButton: React.FC<DemoButtonProps> = ({ onStartDemo }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [issueDetails, setIssueDetails] = useState('');

    const handleSendEmail = () => {
        const subject = encodeURIComponent('LinkedIn Auto Apply - Issue Report');
        const body = encodeURIComponent(issueDetails);
        window.location.href = `mailto:tools.qerds@gmail.com?subject=${subject}&body=${body}`;
        setIsIssueModalOpen(false);
        setIssueDetails('');
    };

    return (
        <div className="demo-button-container">
            <button
                className="demo-trigger-button"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Help & Tutorials"
                aria-expanded={isExpanded}
            >
                <span className="demo-icon">?</span>
            </button>

            {isExpanded && (
                <div className="demo-menu">
                    <div className="demo-menu-header">
                        <h4>Support Center</h4>
                        <button onClick={() => setIsExpanded(false)} aria-label="Close menu">✕</button>
                    </div>
                    <div className="demo-menu-items">
                        <button
                            className="demo-menu-item"
                            onClick={() => {
                                onStartDemo();
                                setIsExpanded(false);
                            }}
                        >
                            <span>🎬</span> Start Tour
                        </button>
                        
                        <a
                            href="https://github.com/sirusdas/ai-auto-apply-jobs-ts/issues/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="demo-menu-item"
                        >
                            <span>🐛</span> Raise on GitHub
                        </a>

                        <button
                            className="demo-menu-item"
                            onClick={() => {
                                setIsIssueModalOpen(true);
                                setIsExpanded(false);
                            }}
                        >
                            <span>📧</span> Email Support
                        </button>
                    </div>
                </div>
            )}

            {isIssueModalOpen && (
                <div className="issue-modal-overlay">
                    <div className="issue-modal-content">
                        <div className="issue-modal-header">
                            <h3>Report an Issue</h3>
                            <button 
                                className="issue-modal-close" 
                                onClick={() => setIsIssueModalOpen(false)}
                            >✕</button>
                        </div>
                        <div className="issue-modal-body">
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                Please describe the issue you're experiencing. Clicking "Send" will open your email client.
                            </p>
                            <textarea
                                value={issueDetails}
                                onChange={(e) => setIssueDetails(e.target.value)}
                                placeholder="Type issue details here..."
                                autoFocus
                            />
                        </div>
                        <div className="issue-modal-footer">
                            <button 
                                className="btn-secondary" 
                                onClick={() => setIsIssueModalOpen(false)}
                            >Cancel</button>
                            <button 
                                className="btn-primary" 
                                onClick={handleSendEmail}
                                disabled={!issueDetails.trim()}
                            >Send Email</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
