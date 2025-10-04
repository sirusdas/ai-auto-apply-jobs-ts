// Key for the encrypted API token
const API_TOKEN_KEY = 'apiToken';
// Key for the next validation timestamp
const TOKEN_VALIDATION_TIMESTAMP_KEY = 'tokenValidationTimestamp';
// Key for the token data
const TOKEN_DATA_KEY = 'tokenData';
// Token validation endpoint
const TOKEN_VALIDATION_ENDPOINT = 'https://qerds.com/tools/tgs/api/tokens/validate';
// Token validation retry delay (5 seconds)
const TOKEN_VALIDATION_RETRY_DELAY = 5000;
// Maximum retries
const MAX_RETRIES = 3;

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchToken') {
    const token = request.token;
    console.log('Received token:', token);
    fetchToken(token)
      .then((response) => {
        // Extract token type from the response
        const planType = response?.data?.planType || 'Free'; // Default to 'Free' if not found
        // Store the token type in chrome.storage.local
        chrome.storage.local.set({ planType: planType }, () => {
          console.log('Token type stored:', planType);
          sendResponse(response);
        });
      })
      .catch((error: any) => {
        console.error('Error validating token:', error);
        sendResponse({ valid: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'openDefaultInputPage') {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html#personal-info') });
  }
  
  if (request.action === 'updateJobCount') {
    chrome.storage.local.get(['appliedJobs'], (result) => {
      const today = new Date().toISOString().split('T')[0];
      const appliedJobs = result.appliedJobs || {};
      const jobs = appliedJobs[today] || [];
      chrome.storage.local.set({ jobCount: jobs.length });
    });
  }
});

// Function to decrypt token
function decryptToken(encryptedToken: string): string {
  // First check if it looks like a hexadecimal string (which is what we see in the logs)
  if (/^[A-Fa-f0-9]{64}$/.test(encryptedToken)) {
    // This looks like a 256-bit hex string (64 chars), it's already decrypted
    console.log('Token appears to be a hexadecimal string and already decrypted');
    return encryptedToken;
  }
  
  // Then check if it looks like a Base64 string
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(encryptedToken)) {
    try {
      // Try to decode as base64
      const decoded = atob(encryptedToken);
      console.log('Decoded token from base64');
      
      // Check if decoded result looks like a valid token
      // Allow hexadecimal tokens as well as tokens with common special characters
      if (/^[A-Fa-f0-9]{64}$/.test(decoded) || /^[A-Za-z0-9._-]+$/.test(decoded)) {
        return decoded;
      } else {
        console.warn('Decoded token format is invalid');
        return '';
      }
    } catch (e) {
      console.error('Error decoding base64 token:', e);
      return '';
    }
  }
  
  // If it doesn't look like Base64, check if it's already a valid token format
  if (/^[A-Za-z0-9._-]+$/.test(encryptedToken)) {
    console.log('Token appears to be already decrypted');
    return encryptedToken;
  }
  
  console.warn('Token format is invalid');
  return '';
}

// Get stored token data from chrome.storage.local
async function getToken(): Promise<string | null> {
  console.log('getToken function called');
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([API_TOKEN_KEY], (result) => {
      console.log('Retrieved token:', result[API_TOKEN_KEY]); // Debug log
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const encryptedToken = result[API_TOKEN_KEY];
        if (encryptedToken) {
          try {
            const decryptedToken = decryptToken(encryptedToken);
            // Validate that the token looks like a proper token
            if (decryptedToken && decryptedToken.length > 10) { // Tokens are usually longer than 10 chars
              resolve(decryptedToken);
            } else {
              resolve(null);
            }
          } catch (e) {
            console.error('Error decrypting token:', e);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      }
    });
  });
}

async function fetchToken(req_token: string = ''): Promise<any> {
  let token = '';
  if (req_token) {
    token = req_token;
  } else {
    const tokenResult = await getToken();
    if (tokenResult) {
      token = tokenResult;
    }
  }

  if (!token) {
    console.warn('No token found');
    return { valid: false, error: 'No token found' };
  }

  // Validate token format before sending
  if (typeof token !== 'string' || token.length === 0) {
    console.warn('Invalid token format');
    return { valid: false, error: 'Invalid token format' };
  }

  // Additional validation - check if token contains non-printable characters
  if (!/^[\x20-\x7E]+$/.test(token)) {
    console.warn('Token contains non-printable characters, might be corrupted');
    console.warn('Token (first 20 chars):', token.substring(0, 20));
    return { valid: false, error: 'Token appears to be corrupted' };
  }

  // Additional validation - check token length (typical API tokens are longer than 10 chars)
  if (token.length < 10) {
    console.warn('Token seems too short to be valid');
    return { valid: false, error: 'Token appears to be invalid (too short)' };
  }

  try {
    console.log('Sending token validation request with token (first 10 chars):', token.substring(0, 10) + '...'); // Log only part of the token for security
    const response = await fetch(TOKEN_VALIDATION_ENDPOINT, {
      method: 'GET',
      headers: {
        'x-api-key': token.trim(), // Trim whitespace which might cause issues
      },
    });

    if (response.status === 401) {
      return { valid: false, error: 'Invalid token' }; // Don't retry on 401
    }

    if (!response.ok) {
      console.error(`Token validation failed with status: ${response.status}`);
      // Try to get error details from response
      let errorDetails = '';
      try {
        const errorData = await response.text();
        errorDetails = `Response: ${errorData}`;
      } catch (e) {
        errorDetails = `Could not parse error response`;
      }
      return { valid: false, error: `Validation failed with status: ${response.status}. ${errorDetails}` };
    }

    const data = await response.json();
    return { valid: data?.valid, data };
  } catch (error: any) {
    console.error('Error during token validation:', error);
    return { valid: false, error: error.message };
  }
}

// Listen for a message to open a page (like settings.html)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openPage') {
    chrome.tabs.create({ url: message.url });
  }
});

// Open settings page with demo on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html?firstInstall=true')
    });
  }
});

// Listen for clicks when user clicks on the extension icon from chrome extension settings
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default values for settings
    chrome.storage.local.set({
      applyToProductCompanies: true,
      applyToServiceCompanies: true,
      veryShortDelay: '1000',
      shortDelay: '5000',
      longDelay: '7000',
      minMatchScore: '3',
      useCustomAI: false, // By default, use Gemini API
      geminiModel: 'gemini-2.0-flash-lite' // Default Gemini model
    }, () => {
      console.log('Default settings initialized');
    });
  }
});