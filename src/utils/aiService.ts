import { AIRequest, AIResponse, AISettings, AIProvider } from '../types';
import { handleModelFailure } from './modelFetcher';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { OpenAIProvider } from './providers/openaiProvider';

export interface IAIProvider {
    id: string;
    name: string;
    sendRequest(prompt: string, options?: any): Promise<AIResponse>;
    updateConfig?(config: AIProvider): void;
}

export class AIService {
    private settings: AISettings | null = null;
    private providers: Map<string, IAIProvider> = new Map();

    constructor() {
        // Providers will be registered via init or registerProvider
    }

    async init() {
        const result = await chrome.storage.local.get(['aiSettings']);
        this.settings = result.aiSettings as AISettings;
        
        if (this.settings && this.settings.providers) {
            this.settings.providers.forEach(p => {
                if (p.id === 'gemini') this.registerProvider(new GeminiProvider(p));
                if (p.id === 'claude') this.registerProvider(new ClaudeProvider(p));
                if (p.id === 'openai') this.registerProvider(new OpenAIProvider(p));
            });
        }
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
            // Check if this is a model-related error that we might be able to fix
            const errorMessage = error.message || '';
            const isModelError = errorMessage.toLowerCase().includes('model') || 
                               errorMessage.includes('400') || 
                               errorMessage.includes('404') || 
                               errorMessage.toLowerCase().includes('not found') ||
                               errorMessage.includes('Gemini API error');

            if (isModelError) {
                console.log(`Detected potential model error for ${providerId}: ${errorMessage}`);
                console.log(`Attempting to automatically fix model issue for ${providerId}...`);
                
                const fixed = await handleModelFailure(providerId);
                if (fixed) {
                    console.log('Model fix applied successfully! Refreshing AI Service and retrying...');
                    // Re-initialize settings and providers to get the new model
                    await this.init();
                    
                    // Get the fresh provider
                    const updatedProvider = this.providers.get(providerId);
                    if (updatedProvider) {
                        try {
                            return await updatedProvider.sendRequest(request.prompt, request);
                        } catch (retryError) {
                            console.error('Retry after model fix failed:', retryError);
                        }
                    }
                }
            }

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
                } catch (error: any) {
                    console.error(`Fallback to ${providerConfig.name} failed:`, error);
                    
                    const errorMessage = error.message || '';
                    const isModelError = errorMessage.toLowerCase().includes('model') || 
                                       errorMessage.includes('400') || 
                                       errorMessage.includes('404') || 
                                       errorMessage.toLowerCase().includes('not found') ||
                                       errorMessage.includes('Gemini API error');

                    if (isModelError) {
                        if (providerConfig.enabled && providerConfig.apiKey) {
                            console.log(`Attempting to fix model issue for fallback provider ${providerConfig.id}...`);
                            const fixed = await handleModelFailure(providerConfig.id);
                            if (fixed) {
                                console.log(`Model fix applied for fallback ${providerConfig.id}! Refreshing and retrying...`);
                                await this.init();
                                const updatedProvider = this.providers.get(providerConfig.id);
                                if (updatedProvider) {
                                    try {
                                        return await updatedProvider.sendRequest(prompt);
                                    } catch (retryError) {
                                        console.error(`Retry for fallback ${providerConfig.id} failed:`, retryError);
                                    }
                                }
                            }
                        }
                    }
                    continue;
                }
            }
        }

        throw new Error('All AI providers failed including fallbacks.');
    }
}
