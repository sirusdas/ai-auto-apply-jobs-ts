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

import { AIService } from '../utils/aiService';
import { GeminiProvider } from '../utils/providers/geminiProvider';
import { ClaudeProvider } from '../utils/providers/claudeProvider';
import { OpenAIProvider } from '../utils/providers/openaiProvider';
import { migrateToMultiAI } from '../utils/migration';
import { AISettings } from '../types';
import * as tokenService from '../utils/tokenService';

const aiService = new AIService();

async function initAIService() {
  await migrateToMultiAI();
  const result = await chrome.storage.local.get(['aiSettings']);
  const settings = result.aiSettings as AISettings;

  if (settings) {
    settings.providers.forEach(p => {
      if (p.id === 'gemini') aiService.registerProvider(new GeminiProvider(p));
      if (p.id === 'claude') aiService.registerProvider(new ClaudeProvider(p));
      if (p.id === 'openai') aiService.registerProvider(new OpenAIProvider(p));
    });
  }
}

// Initialize validation schedule and periodic checks
async function initTokenManagement() {
  await tokenService.initializeValidationSchedule();

  // Check expiry on startup
  checkTokenExpiry();

  // Set up periodic check for validation (every minute)
  setInterval(async () => {
    const shouldValidate = await tokenService.shouldValidate();
    if (shouldValidate) {
      const token = await tokenService.getToken();
      if (token) {
        console.log('Background: Performing periodic token validation');
        await tokenService.validateToken();
      }
    }
  }, 60000);
}

async function checkTokenExpiry() {
  const tokenData = await tokenService.getTokenData();
  if (!tokenData || !tokenData.valid || !tokenData.expires_at) return;

  const expiryDate = new Date(tokenData.expires_at);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    chrome.notifications.create('token-expired', {
      type: 'basic',
      iconUrl: '128128.png',
      title: 'API Token Expired',
      message: 'Your API token has expired. Please renew it to continue using AI features.',
      priority: 2
    });
  } else if (diffDays <= 7) {
    chrome.notifications.create('token-expiring', {
      type: 'basic',
      iconUrl: '128128.png',
      title: 'API Token Expiring Soon',
      message: `Your API token will expire in ${diffDays} days. Please renew it soon.`,
      priority: 1
    });
  }
}

initAIService();
initTokenManagement();

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchToken') {
    const token = request.token;
    console.log('Received token:', token);
    fetchToken(token)
      .then((response) => {
        // Extract token type from the response
        const planType = response?.data?.planType || response?.planType || 'Free';
        // Store the token type in chrome.storage.local for compatibility
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

  if (request.action === 'clearToken') {
    chrome.storage.local.remove([
      tokenService.API_TOKEN_KEY,
      tokenService.TOKEN_DATA_KEY,
      tokenService.TOKEN_VALIDATION_TIMESTAMP_KEY,
      'planType'
    ], () => {
      sendResponse({ success: true });
    });
    return true;
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

    handleJobMatch(jobDetails, resume)
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
    const { inputs, radios, dropdowns, checkboxes, resume } = request;
    console.log('Received answerJobQuestions request');

    handleQuestionAnswering(inputs, radios, dropdowns, checkboxes, resume)
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
    const { companies } = request;
    console.log('Received filterCompanies request for', companies.length, 'companies');

    handleCompanyFiltering(companies)
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('Error in filterCompanies:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true;
  }

  if (request.action === 'generateResume') {
    const { prompt } = request;
    aiService.sendRequest({ prompt: prompt })
      .then((response) => {
        sendResponse({ success: true, data: response });
      })
      .catch((error) => {
        console.error('Error in generateResume:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true;
  }
});

// Listen for AI settings changes and re-initialize providers
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.aiSettings) {
    console.log('AI settings changed, re-initializing providers...');
    initAIService();
  }
});

async function handleCompanyFiltering(companies: string[]) {
  const promptText = 'Find the company category(product based or service based also mention their industries and add a parameter is_it as (true or false, based on IT or non-IT) and output as a json as {"product_companies": [{"company_name":"","industry":"", is_it: true}], "service_companies": [...]} for the below companies: ' + JSON.stringify(companies);

  const response = await aiService.sendRequest({ prompt: promptText });
  const contentText = response.content;

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


async function handleJobMatch(jobDetails: any, resume: string) {
  // Construct the prompt
  const promptText = 'As per resume and jd provided Also note: company must be primary product based company(IT, non-IT) or non-IT based service companies only. Output as {"company_name":"","company_type":"service/product", "industry":"IT/Non-IT","match_score":0} note match_score based on [1. Average Match, 2. Above average, 3. Good, 4. Excellent, 5. Outstanding]. Resume: ' + resume + " JD: Title:" + jobDetails.jobTitle + " Desc: " + jobDetails.description + " Company: " + jobDetails.company;

  console.log('Sending request to AI Service...');

  const response = await aiService.sendRequest({ prompt: promptText });
  console.log("Received AI response:", response);

  const contentText = response.content.trim();

  // Secondary delay (reduced)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
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
  checkboxes: any[],
  resume: string
) {

  const promptText = `Do not specify resume in solution and when asked for numbers give pure numbers without any words.Select the correct options after comparing with my resume and output the data as {"inputs":{"Your Name": "suresh", ...}, "dropdowns":{...}, "radios":{...}, "checkboxes":{ "I agree": "yes", ...}} for the below Inputs: ${JSON.stringify(inputs)} || Radios: ${JSON.stringify(radios)} || Dropdown: ${JSON.stringify(dropdowns)} || Checkboxes: ${JSON.stringify(checkboxes)} Resume: ${resume}`;

  console.log('Sending question answering request to AI Service...');

  const response = await aiService.sendRequest({ prompt: promptText });
  console.log("Received AI answer response:", response);

  const contentText = response.content.trim();

  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
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
      radios: parsedContent.radios || {},
      checkboxes: parsedContent.checkboxes || {}
    };

  } catch (e: any) {
    console.error("Error parsing AI response for answers:", e);
    throw new Error("Failed to parse AI response: " + e.message);
  }
}