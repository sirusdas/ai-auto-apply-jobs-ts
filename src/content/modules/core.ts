// Core functionality for the auto-apply extension

// Default fields
export let defaultFields: { [key: string]: string } = {
    YearsOfExperience: '5',
    City: 'New York',
    FirstName: 'John',
    LastName: 'Doe',
    Email: 'john.doe@example.com',
    PhoneNumber: '555-123-4567'
};

export const dailyLimit = 20;
export let timeoutReached = false;
export let scriptStopped = false;
export let timeout20: number, timeout40: number, timeout80: number;
export let minMatchScore: number | undefined;
export let DAILY_LIMIT = 20;

// Window property helpers
export function getRunningScript(): boolean {
    return (window as any).runningScript || false;
}

export function setRunningScript(value: boolean): void {
    (window as any).runningScript = value;
}

export function getIsPaused(): boolean {
    return (window as any).isPaused || false;
}

export function setIsPaused(value: boolean): void {
    (window as any).isPaused = value;
}

// State management functions
export function setTimeoutReached(value: boolean): void {
    timeoutReached = value;
}

export function setScriptStopped(value: boolean): void {
    scriptStopped = value;
}

// Add delays
export async function addVeryShortDelay() {
    const veryShortDelay = await new Promise<number>(resolve => {
        chrome.storage.local.get(['veryShortDelay'], (result) => {
            resolve(result.veryShortDelay ? parseInt(result.veryShortDelay) : 1000);
        });
    });
    return new Promise(resolve => setTimeout(resolve, veryShortDelay));
}

export async function addShortDelay() {
    const shortDelay = await new Promise<number>(resolve => {
        chrome.storage.local.get(['shortDelay'], (result) => {
            resolve(result.shortDelay ? parseInt(result.shortDelay) : 5000);
        });
    });
    return new Promise(resolve => setTimeout(resolve, shortDelay));
}

export async function addMediumDelay() {
    const mediumDelay = await new Promise<number>(resolve => {
        chrome.storage.local.get(['mediumDelay'], (result) => {
            resolve(result.mediumDelay ? parseInt(result.mediumDelay) : 10000);
        });
    });
    return new Promise(resolve => setTimeout(resolve, mediumDelay));
}

export async function addDelay() {
    const longDelay = await new Promise<number>(resolve => {
        chrome.storage.local.get(['longDelay'], (result) => {
            resolve(result.longDelay ? parseInt(result.longDelay) : 7000);
        });
    });
    return new Promise(resolve => setTimeout(resolve, longDelay));
}

export async function addVeryLongDelay() {
    const veryLongDelay = await new Promise<number>(resolve => {
        chrome.storage.local.get(['veryLongDelay'], (result) => {
            resolve(result.veryLongDelay ? parseInt(result.veryLongDelay) : 15000);
        });
    });
    return new Promise(resolve => setTimeout(resolve, veryLongDelay));
}

// Function to check if script is running
export function isScriptRunning() {
    return getRunningScript() && !getIsPaused() && !timeoutReached && !scriptStopped;
}