import { AISettings } from '../types';

export async function migrateToMultiAI() {
    const result = await chrome.storage.local.get(['accessToken', 'aiSettings']);

    if (result.accessToken && !result.aiSettings) {
        console.log('Migrating existing Gemini access token to new AISettings structure...');

        const newSettings: AISettings = {
            providers: [
                {
                    id: 'gemini',
                    name: 'Google Gemini',
                    enabled: true,
                    apiKey: result.accessToken,
                    model: 'gemma-3-27b-it',
                    priority: 1
                },
                {
                    id: 'claude',
                    name: 'Anthropic Claude',
                    enabled: false,
                    apiKey: '',
                    model: 'claude-3-5-sonnet-20241022',
                    priority: 2
                },
                {
                    id: 'openai',
                    name: 'OpenAI ChatGPT',
                    enabled: false,
                    apiKey: '',
                    model: 'gpt-4o',
                    priority: 3
                }
            ],
            primaryProvider: 'gemini',
            enableFallback: false,
            timeout: 30000
        };

        await chrome.storage.local.set({ aiSettings: newSettings });
        console.log('Migration complete.');
    }
}
