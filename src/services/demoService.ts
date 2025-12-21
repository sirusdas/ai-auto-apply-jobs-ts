import { DemoState, DemoFlow } from '../types/demo';

const STORAGE_KEY = 'demoState';

class DemoService {
    private state: DemoState;

    constructor() {
        this.state = {
            hasSeenFirstInstall: false,
            hasCompletedSidebarDemo: false,
            hasCompletedSettingsDemo: false,
            currentStepIndex: 0,
            dismissedInfoModals: []
        };
    }

    async initialize(): Promise<void> {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        if (stored[STORAGE_KEY]) {
            this.state = { ...this.state, ...stored[STORAGE_KEY] };
        }
    }

    async saveState(): Promise<void> {
        await chrome.storage.local.set({ [STORAGE_KEY]: this.state });
    }

    async shouldShowFirstInstallDemo(): Promise<boolean> {
        await this.initialize();
        return !this.state.hasSeenFirstInstall;
    }

    async markFirstInstallComplete(): Promise<void> {
        this.state.hasSeenFirstInstall = true;
        await this.saveState();
    }

    async startDemo(flowId: DemoFlow['id']): Promise<void> {
        this.state.currentDemoFlow = flowId;
        this.state.currentStepIndex = 0;
        await this.saveState();
    }

    async nextStep(): Promise<void> {
        this.state.currentStepIndex++;
        await this.saveState();
    }

    async skipDemo(): Promise<void> {
        const flowId = this.state.currentDemoFlow;
        this.state.currentDemoFlow = undefined;
        this.state.currentStepIndex = 0;

        // Mark as completed
        if (flowId === 'first-install') {
            this.state.hasSeenFirstInstall = true;
        } else if (flowId === 'sidebar') {
            this.state.hasCompletedSidebarDemo = true;
        } else if (flowId === 'settings') {
            this.state.hasCompletedSettingsDemo = true;
        }

        await this.saveState();
    }

    async dismissInfoModal(optionId: string): Promise<void> {
        if (!this.state.dismissedInfoModals.includes(optionId)) {
            this.state.dismissedInfoModals.push(optionId);
            await this.saveState();
        }
    }

    getState(): DemoState {
        return { ...this.state };
    }
}

export const demoService = new DemoService();
