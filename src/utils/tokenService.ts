import { TokenData, ValidationResult, ErrorInfo } from '../types';

export const API_TOKEN_KEY = 'apiToken';
export const TOKEN_VALIDATION_TIMESTAMP_KEY = 'tokenValidationTimestamp';
export const TOKEN_DATA_KEY = 'tokenData';
export const TOKEN_VALIDATION_ENDPOINT = 'https://qerds.com/tools/tgs/api/tokens/validate';
export const TOKEN_VALIDATION_RETRY_DELAY = 5000;
export const MAX_RETRIES = 3;

// Encryption helpers for Phase 5 Security Enhancements
const ENCRYPTION_KEY_NAME = 'api_token_encryption_key';

async function getOrCreateKey(): Promise<CryptoKey> {
    const result = await chrome.storage.local.get([ENCRYPTION_KEY_NAME]);
    if (result[ENCRYPTION_KEY_NAME]) {
        const keyData = result[ENCRYPTION_KEY_NAME];
        return await crypto.subtle.importKey(
            'jwk',
            keyData,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const exportedKey = await crypto.subtle.exportKey('jwk', key);
    await chrome.storage.local.set({ [ENCRYPTION_KEY_NAME]: exportedKey });
    return key;
}

/**
 * Encrypts a token using AES-GCM
 */
export async function encryptToken(token: string): Promise<string> {
    try {
        const key = await getOrCreateKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encodedToken = new TextEncoder().encode(token);

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedToken
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.error('Encryption failed', e);
        return btoa(token); // Fallback to base64 if crypto fails
    }
}

/**
 * Decrypts a token using AES-GCM
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
    try {
        const binaryString = atob(encryptedToken);
        const combined = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            combined[i] = binaryString.charCodeAt(i);
        }

        // If it's too short, it's probably old base64 format (no IV)
        if (combined.length < 13) {
            return atob(encryptedToken);
        }

        const key = await getOrCreateKey();
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.log('Decryption failed, assuming legacy format or raw token');
        try {
            return atob(encryptedToken);
        } catch {
            return encryptedToken;
        }
    }
}

/**
 * Saves the token securely in chrome.storage.local
 */
export async function saveToken(token: string): Promise<void> {
    const encryptedToken = await encryptToken(token);
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [API_TOKEN_KEY]: encryptedToken }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Gets the stored token from chrome.storage.local
 */
export async function getToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([API_TOKEN_KEY], async (result) => {
            const encryptedToken = result[API_TOKEN_KEY];
            if (!encryptedToken) {
                resolve(null);
                return;
            }
            const decrypted = await decryptToken(encryptedToken);
            resolve(decrypted);
        });
    });
}

/**
 * Gets the stored token data from chrome.storage.local
 */
export async function getTokenData(): Promise<TokenData | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_DATA_KEY], (result) => {
            const tokenData = result[TOKEN_DATA_KEY];
            if (!tokenData) {
                resolve(null);
                return;
            }
            try {
                resolve(typeof tokenData === 'string' ? JSON.parse(tokenData) : tokenData);
            } catch (e) {
                console.error('Error parsing token data', e);
                resolve(null);
            }
        });
    });
}

/**
 * Schedules the next validation at a random time within the next hour
 */
export function scheduleNextValidation(): void {
    const now = Date.now();
    const randomOffset = Math.floor(Math.random() * 60 * 60 * 1000); // Random time within the next hour
    const nextValidationTimestamp = now + randomOffset;
    chrome.storage.local.set({ [TOKEN_VALIDATION_TIMESTAMP_KEY]: nextValidationTimestamp });
}

/**
 * Checks if token validation is required based on expiration/schedule
 */
export async function shouldValidate(): Promise<boolean> {
    const now = Date.now();
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_VALIDATION_TIMESTAMP_KEY], (result) => {
            const nextValidationTimestamp = result[TOKEN_VALIDATION_TIMESTAMP_KEY];
            if (!nextValidationTimestamp || now >= nextValidationTimestamp) {
                resolve(true); // Validation is required
            } else {
                resolve(false); // Use cached data
            }
        });
    });
}

/**
 * Validates token with caching logic
 */
export async function validateTokenWithCache(token?: string): Promise<ValidationResult> {
    const shouldValidateNow = await shouldValidate();

    if (!shouldValidateNow && !token) {
        const cachedTokenData = await getTokenData();
        if (cachedTokenData) {
            return { valid: cachedTokenData.valid, data: cachedTokenData };
        }
    }

    const validationResult = await validateToken(0, token);
    if (validationResult.valid) {
        scheduleNextValidation();
    }
    return validationResult;
}

/**
 * Performs actual token validation via background script messaging
 */
export async function validateToken(
    retryCount = 0,
    reqToken?: string,
    operation?: string
): Promise<ValidationResult> {
    let token = reqToken;
    if (!token) {
        token = await getToken() || undefined;
    }

    if (!token) {
        return { valid: false, error: 'No token found' };
    }

    try {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'fetchToken', token: token }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error communicating with background script:', chrome.runtime.lastError);
                    resolve({ valid: false, error: 'Background script communication error' });
                    return;
                }

                if (!response) {
                    resolve({ valid: false, error: 'No response from background script' });
                    return;
                }

                if (response.error) {
                    // Update cached error data
                    const errorInfo: ErrorInfo = {
                        message: response.error,
                        timestamp: new Date().toISOString()
                    };
                    const existingData = await getTokenData();
                    const updatedData: Partial<TokenData> = {
                        ...existingData,
                        valid: false,
                        last_error: errorInfo
                    };
                    chrome.storage.local.set({ [TOKEN_DATA_KEY]: updatedData });
                    resolve({ valid: false, error: response.error });
                    return;
                }

                // Token is valid, store data
                const tokenData: TokenData = {
                    valid: true,
                    planType: response.data?.planType || 'Free',
                    expires_at: response.data?.expires_at || '',
                    usage_count: response.data?.usage_count || 0,
                    last_validated: new Date().toISOString(),
                    last_error: null
                };

                if (operation !== 'save-token') {
                    chrome.storage.local.set({ [TOKEN_DATA_KEY]: tokenData });
                }

                resolve({ valid: true, data: tokenData });
            });
        });
    } catch (error: any) {
        console.error('Validation error:', error);

        if (retryCount < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, TOKEN_VALIDATION_RETRY_DELAY));
            return validateToken(retryCount + 1, reqToken, operation);
        }

        return { valid: false, error: error.message };
    }
}

/**
 * Initializes the validation schedule if not already present
 */
export async function initializeValidationSchedule(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_VALIDATION_TIMESTAMP_KEY], (result) => {
            if (!result[TOKEN_VALIDATION_TIMESTAMP_KEY]) {
                scheduleNextValidation();
            }
            resolve();
        });
    });
}
