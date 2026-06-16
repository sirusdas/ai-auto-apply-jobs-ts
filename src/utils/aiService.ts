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
            const response = await provider.sendRequest(request.prompt, request);
            // Reset retry count on successful request
            chrome.storage.local.set({ aiRetryCount: 0 });
            return response;
        } catch (error: any) {
            console.error(`AI Provider ${providerId} failed:`, error);
            
            const isCooldown = this.isCooldownError(error);
            if (isCooldown) {
                console.log(`Detected cooldown/rate-limit error for ${providerId}.`);
                throw new Error('RATE_LIMIT_COOLDOWN');
            }

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
                        } catch (retryError: any) {
                            console.error('Retry after model fix failed:', retryError);
                            if (this.isCooldownError(retryError)) {
                                throw new Error('RATE_LIMIT_COOLDOWN');
                            }
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

    private isCooldownError(error: any): boolean {
        const message = (error.message || '').toLowerCase();
        return message.includes('429') || 
               message.includes('rate limit') || 
               message.includes('too many requests') ||
               message.includes('quota exceeded') ||
               message.includes('cool down') ||
               message.includes('cooldown') ||
               message.includes('exhausted') ||
               message.includes('503'); // Service unavailable often means overloaded/cooling down
    }

    private async sendRequestWithFallback(prompt: string, failedProviderId: string): Promise<AIResponse> {
        if (!this.settings) return { provider: 'none', content: '', error: 'Settings not initialized' };

        const sortedProviders = [...this.settings.providers]
            .filter(p => p.enabled && p.id !== failedProviderId && p.apiKey)
            .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        let anyCooldown = false;

        for (const providerConfig of sortedProviders) {
            const provider = this.providers.get(providerConfig.id);
            if (provider) {
                try {
                    console.log(`Falling back to AI provider: ${providerConfig.name}`);
                    const response = await provider.sendRequest(prompt);
                    // Reset retry count on successful fallback
                    chrome.storage.local.set({ aiRetryCount: 0 });
                    return response;
                } catch (error: any) {
                    console.error(`Fallback to ${providerConfig.name} failed:`, error);
                    
                    if (this.isCooldownError(error)) {
                        console.log(`Fallback provider ${providerConfig.id} also in cooldown.`);
                        anyCooldown = true;
                        // Don't return immediately, try other fallbacks if available
                        continue; 
                    }

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
                                        const response = await updatedProvider.sendRequest(prompt);
                                        chrome.storage.local.set({ aiRetryCount: 0 });
                                        return response;
                                    } catch (retryError: any) {
                                        console.error(`Retry for fallback ${providerConfig.id} failed:`, retryError);
                                        if (this.isCooldownError(retryError)) {
                                            anyCooldown = true;
                                            continue;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    continue;
                }
            }
        }

        // If we reach here, all providers failed. 
        if (anyCooldown) {
            throw new Error('RATE_LIMIT_COOLDOWN');
        }

        throw new Error('All AI providers failed including fallbacks.');
    }
}
