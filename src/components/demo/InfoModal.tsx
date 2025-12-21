import React from 'react';
import { OptionInfo } from '../../types/demo';
import { VideoPlayer } from './VideoPlayer';
import './demo.css';

interface InfoModalProps {
    info: OptionInfo;
    onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ info, onClose }) => {
    return (
        <div className="info-modal-overlay" onClick={onClose}>
            <div className="info-modal-content" onClick={e => e.stopPropagation()}>
                <div className="info-modal-header">
                    <h2>{info.title}</h2>
                    <button className="walkthrough-close" onClick={onClose}>✕</button>
                </div>

                <div className="info-modal-body">
                    <section className="info-section">
                        <h3><span>📝</span> Description</h3>
                        <p>{info.description}</p>
                    </section>

                    <section className="info-section">
                        <h3><span>🚀</span> How to Use</h3>
                        <p>{info.usage}</p>
                    </section>

                    {info.bestPractices && (
                        <section className="info-section">
                            <h3><span>💡</span> Best Practices</h3>
                            <p>{info.bestPractices}</p>
                        </section>
                    )}

                    {info.videoUrl && (
                        <section className="info-section">
                            <h3><span>📹</span> Tutorial Video</h3>
                            <VideoPlayer videoUrl={info.videoUrl} />
                        </section>
                    )}

                    {info.relatedOptions && info.relatedOptions.length > 0 && (
                        <section className="info-section">
                            <h3><span>🔗</span> Related Options</h3>
                            <ul>
                                {info.relatedOptions.map(opt => (
                                    <li key={opt}>{opt}</li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                <div className="info-modal-footer">
                    <button className="btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};
