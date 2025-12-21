export interface WalkthroughStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;          // CSS selector for highlight
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: 'click' | 'scroll' | 'wait';
    videoUrl?: string;                // Optional YouTube URL
    nextButtonText?: string;
    skipButtonText?: string;
    highlightPadding?: number;
}

export interface DemoFlow {
    id: 'first-install' | 'sidebar' | 'settings';
    title: string;
    steps: WalkthroughStep[];
    context: 'content' | 'popup' | 'settings';
}

export interface DemoState {
    hasSeenFirstInstall: boolean;
    hasCompletedSidebarDemo: boolean;
    hasCompletedSettingsDemo: boolean;
    currentDemoFlow?: string;
    currentStepIndex: number;
    dismissedInfoModals: string[];
}

export interface OptionInfo {
    optionId: string;
    title: string;
    description: string;
    usage: string;
    bestPractices?: string;
    videoUrl?: string;
    relatedOptions?: string[];
}
