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
                            href="https://github.com/sirusdas/ai-auto-apply-jobs-ts/issues/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="demo-menu-item"
                        >
                            <span>🐛</span> Raise on GitHub
                        </a>

                        <a
                            href="mailto:tools.qerds@gmail.com?subject=LinkedIn%20Auto%20Apply%20-%20Support%20Request"
                            className="demo-menu-item"
                            onClick={() => setIsExpanded(false)}
                        >
                            <span>📧</span> tools.qerds@gmail.com
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
