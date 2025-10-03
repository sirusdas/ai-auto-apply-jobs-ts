// Storage utility functions for the auto-apply extension

// Specific storage interface for job tracking
export interface JobStorageData {
    dailyJobCount?: number;
    lastReset?: string;
}

// Function to get daily job count
export async function getDailyJobCount(): Promise<number> {
    return new Promise<number>((resolve) => {
        chrome.storage.local.get(['dailyJobCount', 'lastReset'], (result) => {
            const now = new Date();
            const lastReset = result.lastReset ? new Date(result.lastReset) : null;

            // Reset the count if it's a new day
            if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
                chrome.storage.local.set({ 
                    dailyJobCount: 0, 
                    lastReset: now.toISOString() 
                }, () => {
                    resolve(0);
                });
            } else {
                resolve(result.dailyJobCount || 0);
            }
        });
    });
}

// Function to update daily job count
export async function updateDailyJobCount(count: number): Promise<void> {
    console.log('Updating daily job count:', count);
    return new Promise<void>((resolve) => {
        chrome.storage.local.set({ dailyJobCount: count }, () => {
            resolve();
        });
    });
}

// Function to check daily limit
export async function checkDailyLimit(useOldFunctions: boolean, dailyLimit: number): Promise<boolean> {
    if (useOldFunctions) {
        const dailyJobCount = await getDailyJobCount();
        if (dailyJobCount >= dailyLimit) {
            console.log('Daily limit reached');
            return true;
        }
    }
    return false;
}
