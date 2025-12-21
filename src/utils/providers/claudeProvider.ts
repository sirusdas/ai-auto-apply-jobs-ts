import { IAIProvider } from '../aiService';
import { AIResponse, AIProvider } from '../../types';

export class ClaudeProvider implements IAIProvider {
    id = 'claude';
    name = 'Anthropic Claude';

    constructor(private config: AIProvider) { }

    async sendRequest(prompt: string): Promise<AIResponse> {
        const apiKey = this.config.apiKey;
        const model = this.config.model || 'claude-3-5-sonnet-20241022';

        if (!apiKey) {
            throw new Error('Claude API key not configured.');
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'dangerously-allow-browser': 'true' // Note: This is usually for client-side SDKs, for fetch we just send headers
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Claude API error: ${response.statusText} ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        const contentText = result.content?.[0]?.text || '';

        return {
            provider: this.id,
            content: contentText
        };
    }
}
