import { IAIProvider } from '../aiService';
import { AIResponse, AIProvider } from '../../types';

export class OpenAIProvider implements IAIProvider {
    id = 'openai';
    name = 'OpenAI ChatGPT';

    constructor(private config: AIProvider) { }

    async sendRequest(prompt: string): Promise<AIResponse> {
        const apiKey = this.config.apiKey;
        const model = this.config.model || 'gpt-4o';

        if (!apiKey) {
            throw new Error('OpenAI API key not configured.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.statusText} ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        const contentText = result.choices?.[0]?.message?.content || '';

        return {
            provider: this.id,
            content: contentText
        };
    }
}
