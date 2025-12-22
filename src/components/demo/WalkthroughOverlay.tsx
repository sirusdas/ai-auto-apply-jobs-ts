import React, { useEffect, useState } from 'react';
import { WalkthroughStep } from '../../types/demo';
import './demo.css';

interface WalkthroughOverlayProps {
    step: WalkthroughStep;
    onNext: () => void;
    onSkip: () => void;
    totalSteps: number;
    currentStep: number;
}

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({
    step,
    onNext,
    onSkip,
    totalSteps,
    currentStep
}) => {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const updatePosition = () => {
            if (step.targetSelector) {
                const element = document.querySelector(step.targetSelector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);

                    // Scroll element into view if not visible
                    const elementTop = rect.top + window.scrollY;
                    const elementBottom = rect.bottom + window.scrollY;
                    const viewportTop = window.scrollY;
                    const viewportBottom = window.scrollY + window.innerHeight;

                    if (elementTop < viewportTop || elementBottom > viewportBottom) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            } else {
                setTargetRect(null);
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        };
    }, [step.targetSelector]);

    const getTooltipPosition = () => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

        const padding = step.highlightPadding || 10;
        const tooltipWidth = 380;
        const tooltipOffset = 20;

        switch (step.position) {
            case 'top':
                return {
                    top: `${targetRect.top - padding - tooltipOffset}px`,
                    left: `${targetRect.left + targetRect.width / 2}px`,
                    transform: 'translate(-50%, -100%)'
                };
            case 'bottom':
                return {
                    top: `${targetRect.bottom + padding + tooltipOffset}px`,
                    left: `${targetRect.left + targetRect.width / 2}px`,
                    transform: 'translate(-50%, 0)'
                };
            case 'left':
                return {
                    top: `${targetRect.top + targetRect.height / 2}px`,
                    left: `${targetRect.left - padding - tooltipOffset}px`,
                    transform: 'translate(-100%, -50%)'
                };
            case 'right':
                return {
                    top: `${targetRect.top + targetRect.height / 2}px`,
                    left: `${targetRect.right + padding + tooltipOffset}px`,
                    transform: 'translate(0, -50%)'
                };
            default:
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
    };

    return (
        <div className="walkthrough-overlay">
            <div className="walkthrough-backdrop" onClick={onSkip}>
                {targetRect && (
                    <div
                        className="walkthrough-spotlight"
                        style={{
                            top: targetRect.top - (step.highlightPadding || 10),
                            left: targetRect.left - (step.highlightPadding || 10),
                            width: targetRect.width + (step.highlightPadding || 10) * 2,
                            height: targetRect.height + (step.highlightPadding || 10) * 2,
                            borderRadius: '12px'
                        }}
                    />
                )}
            </div>

            <div className="walkthrough-tooltip" style={getTooltipPosition()}>
                <div className="walkthrough-header">
                    <h3>{step.title}</h3>
                    <button className="walkthrough-close" onClick={onSkip} aria-label="Close walkthrough">✕</button>
                </div>

                {/* <div className="walkthrough-body">
                    <p>{step.description}</p>

                    {step.videoUrl && (
                        <div className="walkthrough-video-preview">
                            <a href={step.videoUrl} target="_blank" rel="noopener noreferrer">
                                <span>📹</span> Watch Tutorial Video
                            </a>
                        </div>
                    )}
                </div> */}

                <div className="walkthrough-footer">
                    <div className="walkthrough-progress">
                        {currentStep + 1} / {totalSteps}
                    </div>
                    <div className="walkthrough-actions">
                        <button className="btn-secondary" onClick={onSkip}>
                            {step.skipButtonText || 'Skip'}
                        </button>
                        <button className="btn-primary" onClick={onNext}>
                            {step.nextButtonText || (currentStep === totalSteps - 1 ? 'Finish' : 'Next')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
