import { AISettings } from '../types';
import { migrateFromChromeStorage, getJobCount } from './indexedDB';

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

export async function migrateJobsToIndexedDB() {
    const result = await chrome.storage.local.get(['appliedJobs']);

    if (result.appliedJobs && Object.keys(result.appliedJobs).length > 0) {
        console.log('Migrating existing applied jobs from chrome.storage.local to IndexedDB...');

        // Check if IndexedDB is already populated
        const count = await getJobCount();
        if (count > 0) {
            console.log(`IndexedDB already has ${count} jobs. Skipping migration to avoid duplicates.`);
            // Optionally clear the old data if you're confident
            // await chrome.storage.local.remove('appliedJobs');
            return;
        }

        try {
            const importedCount = await migrateFromChromeStorage(result.appliedJobs);
            console.log(`Successfully migrated ${importedCount} jobs to IndexedDB.`);

            // Clear the old data to free up space in chrome.storage.local
            await chrome.storage.local.remove('appliedJobs');
            console.log('Cleared old appliedJobs data from chrome.storage.local.');
        } catch (error) {
            console.error('Failed to migrate jobs to IndexedDB:', error);
        }
    }
}
