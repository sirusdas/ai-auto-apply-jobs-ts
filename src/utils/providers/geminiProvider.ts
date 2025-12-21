import { IAIProvider } from '../aiService';
import { AIResponse, AIProvider } from '../../types';

export class GeminiProvider implements IAIProvider {
    id = 'gemini';
    name = 'Google Gemini';

    constructor(private config: AIProvider) { }

    async sendRequest(prompt: string): Promise<AIResponse> {
        const apiKey = this.config.apiKey;
        const model = this.config.model || 'gemma-3-27b-it';

        if (!apiKey) {
            throw new Error('Gemini API key not configured.');
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const result = await response.json();
        const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            provider: this.id,
            content: contentText
        };
    }
}
