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

  if (request.action === 'checkJobMatch') {
    const { jobDetails, resume, accessToken } = request;
    console.log('Received checkJobMatch request for:', jobDetails.jobTitle);

    handleJobMatch(jobDetails, resume, accessToken)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('Error in checkJobMatch:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true; // Keep channel open
  }

  if (request.action === 'answerJobQuestions') {
    const { inputs, radios, dropdowns, resume, accessToken } = request;
    console.log('Received answerJobQuestions request');

    handleQuestionAnswering(inputs, radios, dropdowns, resume, accessToken)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('Error in answerJobQuestions:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true; // Keep channel open
  }

  if (request.action === 'filterCompanies') {
    const { companies, accessToken } = request;
    console.log('Received filterCompanies request for', companies.length, 'companies');

    handleCompanyFiltering(companies, accessToken)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('Error in filterCompanies:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true;
  }
});

async function handleCompanyFiltering(companies: string[], accessToken: string) {
  if (!accessToken) throw new Error('Access token not provided');

  const promptText = 'Find the company category(product based or service based also mention their industries and add a parameter is_it as (true or false, based on IT or non-IT) and output as a json as {"product_companies": [{"company_name":"","industry":"", is_it: true}], "service_companies": [...]} for the below companies: ' + JSON.stringify(companies);

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=" + accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  const result = await response.json();
  const contentText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract JSON
  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : contentText.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Failed to parse company filter JSON', e);
    return { product_companies: [], service_companies: [] };
  }
}


async function handleJobMatch(jobDetails: any, resume: string, accessToken: string) {
  // Use provided access token (API Key for Google)
  if (!accessToken) {
    throw new Error('Access token (API Key) not provided');
  }

  // Construct the prompt
  const promptText = 'As per resume and jd provided Also note: company must be primary product based company(IT, non-IT) or non-IT based service companies only. Output as {"company_name":"","company_type":"service/product", "industry":"IT/Non-IT","match_score":0} note match_score based on [1. Average Match, 2. Above average, 3. Good, 4. Excellent, 5. Outstanding]. Resume: ' + resume + " JD: Title:" + jobDetails.jobTitle + " Desc: " + jobDetails.description + " Company: " + jobDetails.company;

  console.log('Sending request to Gemini API...');

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=" + accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: promptText
        }]
      }]
    })
  });

  // Initial delay (reduced)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("Received job match response:", result);

  // Secondary delay (reduced)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from API");
    }

    const contentText = candidates[0].content.parts[0].text.trim();

    // Extract JSON from markdown block if present
    const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = '';

    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Clean up potential markdown formatting if regex didn't match perfectly
      jsonString = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedContent = JSON.parse(jsonString);
    console.log("Parsed content:", parsedContent);

    return parsedContent;

  } catch (e: any) {
    console.error("Error parsing AI response:", e);
    // Fallback or re-throw
    throw new Error("Failed to parse AI response: " + e.message);
  }
}

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
      // Initialize default resume
      initializeDefaultResume();
    });
  }
});

// Also run on startup to ensure it's there
chrome.runtime.onStartup.addListener(() => {
  initializeDefaultResume();
});


// Helper function to set default resume if not present
function initializeDefaultResume() {
  const DEFAULT_RESUME = `
John Doe
Software Engineer
San Francisco, CA
john.doe@example.com
(555) 123-4567

Summary:
Experienced Software Engineer with 5+ years of experience in full-stack development. Proficient in JavaScript, TypeScript, React, Node.js, and Python.

Experience:
Senior Software Engineer | Tech Corp | Jan 2020 - Present
- Led a team of 5 engineers to build a new e-commerce platform.
- improved site performance by 40%.

Software Engineer | StartUp Inc | Jun 2017 - Dec 2019
- Developed RESTful APIs using Node.js and Express.
- Built responsive UI components using React and Redux.

Education:
B.S. Computer Science | University of Technology | 2013 - 2017
`;

  chrome.storage.local.get(['plainTextResume'], (result) => {
    if (!result.plainTextResume) {
      console.log('No resume found, initializing default resume for testing...');

      chrome.storage.local.set({ plainTextResume: DEFAULT_RESUME });
    }
  });
}

async function handleQuestionAnswering(
  inputs: any[], 
  radios: any[], 
  dropdowns: any[], 
  resume: string, 
  accessToken: string
) {

  if (!accessToken) {
    throw new Error('Access token (API Key) not provided');
  }

  const promptText = `Do not specify resume in solution and when asked for numbers give pure numbers without any words.Select the correct options after comparing with my resume and output the data as {"inputs":{"Your Name": "suresh", ...}, "dropdowns":{...}, "radios":{...}} for the below Inputs: ${JSON.stringify(inputs)} || Radios: ${JSON.stringify(radios)} || Dropdown: ${JSON.stringify(dropdowns)} Resume: ${resume}`;

  console.log('Sending question answering request to Gemini API...');

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=" + accessToken, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: promptText
        }]
      }]
    })
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const result = await response.json();
  console.log("Received AI answer response:", result);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const candidates = result.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from API");
    }

    const contentText = candidates[0].content.parts[0].text.trim();

    // Extract JSON from markdown block if present
    const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = '';

    if (jsonMatch && jsonMatch[1]) {
      jsonString = jsonMatch[1];
    } else {
      // Clean up potential markdown formatting if regex didn't match perfectly
      jsonString = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsedContent = JSON.parse(jsonString);
    console.log("Parsed answers:", parsedContent);

    return {
      inputs: parsedContent.inputs || {},
      dropdowns: parsedContent.dropdowns || {},
      radios: parsedContent.radios || {}
    };

  } catch (e: any) {
    console.error("Error parsing AI response for answers:", e);
    throw new Error("Failed to parse AI response: " + e.message);
  }
}