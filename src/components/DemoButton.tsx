import React, { useState } from 'react';

interface DemoButtonProps {
    onStartDemo: () => void;
}

export const DemoButton: React.FC<DemoButtonProps> = ({ onStartDemo }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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
                            href="https://youtube.com/playlist?list=YOUR_PLAYLIST_ID"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="demo-menu-item"
                        >
                            <span>📚</span> Video Library
                        </a>
                        <button
                            className="demo-menu-item"
                            onClick={() => {
                                window.open('https://your-docs.com', '_blank');
                                setIsExpanded(false);
                            }}
                        >
                            <span>📖</span> Guide Book
                        </button>
                        <a
                            href="https://github.com/sirusdas/ai-auto-apply-jobs-ts/issues/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="demo-menu-item"
                        >
                            <span>🐛</span> Raise an Issue
                        </a>
                        <a
                            href="mailto:support@example.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="demo-menu-item"
                        >
                            <span>📧</span> Contact Us
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
