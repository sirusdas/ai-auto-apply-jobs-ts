import { IAIProvider } from '../aiService';
import { AIResponse, AIProvider } from '../../types';

export class GeminiProvider implements IAIProvider {
    id = 'gemini';
    name = 'Google Gemini';

    constructor(private config: AIProvider) { }

    async sendRequest(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        const apiKey = this.config.apiKey;
        const model = this.config.model || 'gemma-3-27b-it';

        if (!apiKey) {
            throw new Error('Gemini API key not configured.');
        }

        const body: any = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        if (systemPrompt) {
            body.systemInstruction = {
                parts: [{ text: systemPrompt }]
            };
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const errorMsg = errorBody.error?.message || response.statusText || 'Unknown error';
            throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
        }

        const result = await response.json();
        const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!contentText) {
            throw new Error('Gemini API returned an empty response. This may be due to safety filters or an invalid request.');
        }

        return {
            provider: this.id,
            content: contentText
        };
    }
}
