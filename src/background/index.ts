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
  // Replace this with the corresponding decryption algorithm
  return atob(encryptedToken); // Simple base64 decoding
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
        resolve(encryptedToken ? decryptToken(encryptedToken) : null);
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

  try {
    const response = await fetch(TOKEN_VALIDATION_ENDPOINT, {
      method: 'GET',
      headers: {
        'x-api-key': token,
      },
    });

    if (response.status === 401) {
      return { valid: false, error: 'Invalid token' }; // Don't retry on 401
    }

    if (!response.ok) {
      console.error(`Token validation failed with status: ${response.status}`);
      return { valid: false, error: `Validation failed with status: ${response.status}` };
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
      minMatchScore: '3'
    }, () => {
      console.log('Default settings initialized');
    });
  }
});