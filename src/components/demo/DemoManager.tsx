import React, { useState, useEffect } from 'react';
import { DemoFlow } from '../../types/demo';
import { demoService } from '../../services/demoService';
import { WalkthroughOverlay } from './WalkthroughOverlay';

interface DemoManagerProps {
    flow: DemoFlow;
    onComplete: () => void;
}

export const DemoManager: React.FC<DemoManagerProps> = ({ flow, onComplete }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isActive, setIsActive] = useState(true);

    const currentStep = flow.steps[currentStepIndex];
    const isLastStep = currentStepIndex === flow.steps.length - 1;

    useEffect(() => {
        // Start the demo in the service
        demoService.startDemo(flow.id);
    }, [flow.id]);

    const handleNext = async () => {
        if (isLastStep) {
            await demoService.skipDemo(); // This marks the specific flow as completed
            setIsActive(false);
            onComplete();
        } else {
            setCurrentStepIndex(prev => prev + 1);
            await demoService.nextStep();
        }
    };

    const handleSkip = async () => {
        await demoService.skipDemo();
        setIsActive(false);
        onComplete();
    };

    if (!isActive || !currentStep) return null;

    return (
        <WalkthroughOverlay
            step={currentStep}
            onNext={handleNext}
            onSkip={handleSkip}
            totalSteps={flow.steps.length}
            currentStep={currentStepIndex}
        />
    );
};
