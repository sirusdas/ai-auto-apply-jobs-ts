import { AIProvider, AIResponse } from '../../types';
import { IAIProvider } from '../aiService';

export class CustomProvider implements IAIProvider {
    id: string;
    name: string;
    private config: AIProvider;

    constructor(config: AIProvider) {
        this.id = config.id;
        this.name = config.name;
        this.config = config;
    }

    updateConfig(config: AIProvider) {
        this.config = config;
    }

    async sendRequest(prompt: string, systemPrompt?: string, options?: any): Promise<AIResponse> {
        if (!this.config.apiKey && !this.config.baseUrl?.includes('localhost')) {
            throw new Error(`API key required for ${this.name}.`);
        }

        const model = this.config.customModel || this.config.model;
        if (!model) {
            throw new Error(`No model selected for ${this.name}.`);
        }

        const baseUrl = this.config.baseUrl ? this.config.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
        const endpoint = `${baseUrl}/chat/completions`;

        console.log(`Sending request to custom provider ${this.name} (${endpoint}) using model ${model}...`);
        
        const messages: any[] = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        } else {
            messages.push({ role: 'system', content: 'You are an expert AI assistant tasked with answering job application questions accurately.' });
        }
        messages.push({ role: 'user', content: prompt });

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            // Localhost providers might not require an API key, but we send it if available
            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }
            
            // OpenRouter specific headers (good to have if the baseUrl is openrouter)
            if (baseUrl.includes('openrouter.ai')) {
                headers['HTTP-Referer'] = 'https://github.com/sirusdas/ai-auto-apply-jobs-ts'; // Replace with actual URL
                headers['X-Title'] = 'AI Auto Apply Jobs'; // Replace with actual Title
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.3,
                    response_format: { type: 'json_object' } // Encourage JSON if supported
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Custom Provider API Error (${response.status}):`, errorText);
                throw new Error(`Custom Provider API returned status ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return {
                    provider: this.id,
                    content: data.choices[0].message.content,
                    error: undefined
                };
            } else {
                console.error('Unexpected response format from custom provider:', data);
                throw new Error('Unexpected response format from custom provider.');
            }
        } catch (error: any) {
            console.error('Error in CustomProvider sendRequest:', error);
            throw error;
        }
    }
}
