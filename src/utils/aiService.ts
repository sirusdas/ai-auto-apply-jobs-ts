import { AIRequest, AIResponse, AISettings, AIProvider } from '../types';
import { handleModelFailure } from './modelFetcher';
import { GeminiProvider } from './providers/geminiProvider';
import { ClaudeProvider } from './providers/claudeProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { CustomProvider } from './providers/customProvider';

export interface IAIProvider {
    id: string;
    name: string;
    sendRequest(prompt: string, systemPrompt?: string, options?: any): Promise<AIResponse>;
    updateConfig?(config: AIProvider): void;
}

export class AIService {
    private settings: AISettings | null = null;
    private providers: Map<string, IAIProvider> = new Map();
    private consecutiveFailures: Map<string, number> = new Map();

    constructor() {
        // Providers will be registered via init or registerProvider
    }

    async init() {
        const result = await chrome.storage.local.get(['aiSettings']);
        this.settings = result.aiSettings as AISettings;
        
        // Reset the blacklist because settings (API keys/models) may have been updated
        this.consecutiveFailures.clear();
        
        if (this.settings && this.settings.providers) {
            this.settings.providers.forEach(p => {
                if (p.id === 'gemini') this.registerProvider(new GeminiProvider(p));
                else if (p.id === 'claude') this.registerProvider(new ClaudeProvider(p));
                else if (p.id === 'openai') this.registerProvider(new OpenAIProvider(p));
                else if (p.isCustom) this.registerProvider(new CustomProvider(p));
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

        const failures = this.consecutiveFailures.get(providerId) || 0;
        if (failures >= 3) {
            console.warn(`Provider ${providerId} is blacklisted for this run due to 3 consecutive failures.`);
            if (this.settings?.enableFallback) {
                return await this.sendRequestWithFallback(request, providerId);
            }
            throw new Error(`Provider ${providerId} is blacklisted and fallback is disabled.`);
        }

        let lastError: any = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await provider.sendRequest(request.prompt, request.systemPrompt, request);
                // Reset retry count and failures on successful request
                this.consecutiveFailures.set(providerId, 0);
                chrome.storage.local.set({ aiRetryCount: 0, failedModelsThisCycle: [] });
                return response;
            } catch (error: any) {
                lastError = error;
                console.error(`AI Provider ${providerId} failed (Attempt ${attempt}/3):`, error);
                
                const isCooldown = this.isCooldownError(error);
                if (isCooldown) {
                    console.log(`Detected hard cooldown/rate-limit error for ${providerId}. Skipping remaining retries and failing over immediately.`);
                    // If it's a hard rate limit, there's no point wasting 15-30 seconds retrying. Jump straight to fallback.
                    break;
                }

                // Check if this is a model-related error that we might be able to fix
                const errorMessage = error.message || '';
                const isModelError = !isCooldown && (
                                   errorMessage.toLowerCase().includes('model') || 
                                   errorMessage.includes('400') || 
                                   errorMessage.includes('404') || 
                                   errorMessage.toLowerCase().includes('not found') ||
                                   errorMessage.includes('Gemini API error'));

                if (isModelError) {
                    console.log(`Detected potential model error for ${providerId}: ${errorMessage}`);
                    console.log(`Attempting to automatically fix model issue for ${providerId}...`);
                    
                    const fixed = await handleModelFailure(providerId);
                    if (fixed) {
                        console.log('Model fix applied successfully! Refreshing AI Service and retrying immediately...');
                        await this.init();
                        const updatedProvider = this.providers.get(providerId);
                        if (updatedProvider) {
                            try {
                                return await updatedProvider.sendRequest(request.prompt, request.systemPrompt, request);
                            } catch (retryError: any) {
                                console.error('Retry after model fix failed:', retryError);
                                lastError = retryError;
                            }
                        }
                    } else {
                        console.log(`Could not automatically fix model issue for ${providerId}. Proceeding to fallbacks.`);
                        break;
                    }
                }
                
                if (attempt < 3) {
                    console.log(`Waiting 15 seconds before retrying primary provider...`);
                    await new Promise(resolve => setTimeout(resolve, 15000));
                }
            }
        }

        // If all 3 internal attempts failed, register a major failure for this provider
        const totalFailures = (this.consecutiveFailures.get(providerId) || 0) + 1;
        this.consecutiveFailures.set(providerId, totalFailures);

        if (this.settings?.enableFallback) {
            return await this.sendRequestWithFallback(request, providerId);
        }
        
        const isCooldown = this.isCooldownError(lastError);
        if (isCooldown) {
            throw new Error('RATE_LIMIT_COOLDOWN');
        }
        throw lastError;
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

    private async sendRequestWithFallback(request: AIRequest, failedProviderId: string): Promise<AIResponse> {
        if (!this.settings) return { provider: 'none', content: '', error: 'Settings not initialized' };

        const sortedProviders = [...this.settings.providers]
            .filter(p => p.enabled && p.id !== failedProviderId && (p.apiKey || p.isCustom) && (this.consecutiveFailures.get(p.id) || 0) < 3)
            .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        let anyCooldown = false;

        for (let i = 0; i < sortedProviders.length; i++) {
            const providerConfig = sortedProviders[i];
            
            // Wait 5 seconds before trying the next fallback model to avoid spam/rate-limits
            if (i > 0) {
                console.log(`Waiting 5 seconds before trying fallback provider ${providerConfig.name}...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const provider = this.providers.get(providerConfig.id);
            if (provider) {
                try {
                    console.log(`Falling back to AI provider: ${providerConfig.name}`);
                    const response = await provider.sendRequest(request.prompt, request.systemPrompt, request);
                    // Reset retry count and failures on successful fallback
                    this.consecutiveFailures.set(providerConfig.id, 0);
                    chrome.storage.local.set({ aiRetryCount: 0 });
                    return response;
                } catch (error: any) {
                    console.error(`Fallback to ${providerConfig.name} failed:`, error);
                    
                    const fallbackFailures = (this.consecutiveFailures.get(providerConfig.id) || 0) + 1;
                    this.consecutiveFailures.set(providerConfig.id, fallbackFailures);
                    
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
                                        const response = await updatedProvider.sendRequest(request.prompt, request.systemPrompt, request);
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
