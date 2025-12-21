import { AIRequest, AIResponse, AISettings, AIProvider } from '../types';

export interface IAIProvider {
    id: string;
    name: string;
    sendRequest(prompt: string, options?: any): Promise<AIResponse>;
}

export class AIService {
    private settings: AISettings | null = null;
    private providers: Map<string, IAIProvider> = new Map();

    constructor() {
        // Providers will be registered here
    }

    async init() {
        const result = await chrome.storage.local.get(['aiSettings']);
        this.settings = result.aiSettings as AISettings;
    }

    registerProvider(provider: IAIProvider) {
        this.providers.set(provider.id, provider);
    }

    async sendRequest(request: AIRequest): Promise<AIResponse> {
        if (!this.settings) await this.init();

        const providerId = request.provider || this.settings?.primaryProvider;
        if (!providerId) {
            throw new Error('No AI provider specified and no primary provider set.');
        }

        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`AI provider "${providerId}" not found or not registered.`);
        }

        try {
            return await provider.sendRequest(request.prompt, request);
        } catch (error: any) {
            if (this.settings?.enableFallback) {
                return await this.sendRequestWithFallback(request.prompt, providerId);
            }
            throw error;
        }
    }

    private async sendRequestWithFallback(prompt: string, failedProviderId: string): Promise<AIResponse> {
        if (!this.settings) return { provider: 'none', content: '', error: 'Settings not initialized' };

        const sortedProviders = [...this.settings.providers]
            .filter(p => p.enabled && p.id !== failedProviderId && p.apiKey)
            .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        for (const providerConfig of sortedProviders) {
            const provider = this.providers.get(providerConfig.id);
            if (provider) {
                try {
                    console.log(`Falling back to AI provider: ${providerConfig.name}`);
                    return await provider.sendRequest(prompt);
                } catch (error) {
                    console.error(`Fallback to ${providerConfig.name} failed:`, error);
                    continue;
                }
            }
        }

        throw new Error('All AI providers failed including fallbacks.');
    }
}
