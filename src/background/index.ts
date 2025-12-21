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

  // Check token validity on startup
  checkTokenValidityOnStartup();

  // Log when the next validation will occur
  logNextValidationTime();

  // Set up periodic check for validation (every minute)
  setInterval(async () => {
    const shouldValidate = await tokenService.shouldValidate();
    if (shouldValidate) {
      const token = await tokenService.getToken();
      if (token) {
        console.log('Background: Performing periodic token validation');
        const validationResult = await tokenService.validateToken();

        if (!validationResult.valid) {
          stopExtension('Your API token has been revoked or is invalid. The extension has been stopped.');
        } else {
          // After validation, schedule the next one and log it
          tokenService.scheduleNextValidation();
          logNextValidationTime();
        }
      }
    }
  }, 60000);
}

async function logNextValidationTime() {
  chrome.storage.local.get([tokenService.TOKEN_VALIDATION_TIMESTAMP_KEY], (result) => {
    const nextValidationTimestamp = result[tokenService.TOKEN_VALIDATION_TIMESTAMP_KEY];
    if (nextValidationTimestamp) {
      const nextValidationDate = new Date(nextValidationTimestamp);
      console.log(`Next token validation scheduled for: ${nextValidationDate.toString()}`);
    } else {
      console.log('No token validation scheduled yet');
    }
  });
}

async function checkTokenValidityOnStartup() {
  const tokenData = await tokenService.getTokenData();
  if (!tokenData || !tokenData.valid) {
    // Token is missing or invalid, show notification and offer to go to settings
    chrome.notifications.create('token-invalid', {
      type: 'basic',
      iconUrl: '128128.png',
      title: 'API Token Required',
      message: 'Please update your API token to continue using AI features.',
      priority: 2,
      buttons: [{ title: 'Update Token' }]
    });

    // Listen for notification click to open settings
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === 'token-invalid' && buttonIndex === 0) {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html#settings') });
      }
    });
  }
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
      priority: 2,
      buttons: [{ title: 'Renew Token' }]
    });

    // Listen for notification click to open settings
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === 'token-expired' && buttonIndex === 0) {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html#settings') });
      }
    });
  } else if (diffDays <= 7) {
    chrome.notifications.create('token-expiring', {
      type: 'basic',
      iconUrl: '128128.png',
      title: 'API Token Expiring Soon',
      message: `Your API token will expire in ${diffDays} days. Please renew it soon.`,
      priority: 1,
      buttons: [{ title: 'Renew Token' }]
    });

    // Listen for notification click to open settings
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      if (notificationId === 'token-expiring' && buttonIndex === 0) {
        chrome.tabs.create({ url: chrome.runtime.getURL('settings.html#settings') });
      }
    });
  }
}

async function stopExtension(reason: string) {
  console.warn(`Stopping extension: ${reason}`);
  // Clear job application state to stop the content script loop
  chrome.storage.local.remove(['jobApplicationState'], () => {
    console.log('Job application state cleared.');
  });

  // Notify the user
  chrome.notifications.create('extension-stopped', {
    type: 'basic',
    iconUrl: '128128.png',
    title: 'Extension Stopped',
    message: reason,
    priority: 2
  });
}

async function ensureTokenValid(): Promise<boolean> {
  const tokenData = await tokenService.getTokenData();
  if (!tokenData) return false;

  const isValid = tokenData.valid && new Date(tokenData.expires_at).getTime() > Date.now();

  if (!isValid) {
    stopExtension('API token expired or invalid. Please update your settings.');
  }

  return isValid;
}

initAIService();
initTokenManagement();

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchToken') {
    const token = request.token;
    console.log('Received token:', token);
    tokenService.performTokenValidation(token)
      .then((response) => {
        sendResponse(response);
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
    const { jobDetails, resume } = request;
    console.log('Received checkJobMatch request for:', jobDetails.jobTitle);

    ensureTokenValid()
      .then(isValid => {
        if (!isValid) {
          sendResponse({ success: false, error: 'API token expired or invalid' });
          return;
        }
        handleJobMatch(jobDetails, resume)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error('Error in checkJobMatch:', error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
          });
      });
    return true; // Keep channel open
  }

  if (request.action === 'answerJobQuestions') {
    const { inputs, radios, dropdowns, checkboxes, resume } = request;
    console.log('Received answerJobQuestions request');

    ensureTokenValid()
      .then(isValid => {
        if (!isValid) {
          sendResponse({ success: false, error: 'API token expired or invalid' });
          return;
        }
        handleQuestionAnswering(inputs, radios, dropdowns, checkboxes, resume)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error('Error in answerJobQuestions:', error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
          });
      });
    return true; // Keep channel open
  }

  if (request.action === 'filterCompanies') {
    const { companies } = request;
    console.log('Received filterCompanies request for', companies.length, 'companies');

    ensureTokenValid()
      .then(isValid => {
        if (!isValid) {
          sendResponse({ success: false, error: 'API token expired or invalid' });
          return;
        }
        handleCompanyFiltering(companies)
          .then((data) => {
            sendResponse({ success: true, data });
          })
          .catch((error) => {
            console.error('Error in filterCompanies:', error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
          });
      });
    return true;
  }

  if (request.action === 'generateResume') {
    const { prompt } = request;
    ensureTokenValid()
      .then(isValid => {
        if (!isValid) {
          sendResponse({ success: false, error: 'API token expired or invalid' });
          return;
        }
        aiService.sendRequest({ prompt: prompt })
          .then((response) => {
            sendResponse({ success: true, data: response });
          })
          .catch((error) => {
            console.error('Error in generateResume:', error);
            sendResponse({ success: false, error: error.message || 'Unknown error' });
          });
      });
    return true;
  }

  if (request.action === 'showNotification') {
    chrome.notifications.create('', request.notification, () => { });
    return true;
  }

  if (request.action === 'checkTokenValidity') {
    tokenService.getTokenData()
      .then(tokenData => {
        const isValid = tokenData?.valid && new Date(tokenData.expires_at).getTime() > Date.now();
        sendResponse({ valid: isValid });
      })
      .catch(() => {
        sendResponse({ valid: false });
      });
    return true;
  }

  if (request.action === 'logNextValidationTime') {
    chrome.storage.local.get([tokenService.TOKEN_VALIDATION_TIMESTAMP_KEY], (result) => {
      const nextValidationTimestamp = result[tokenService.TOKEN_VALIDATION_TIMESTAMP_KEY];
      if (nextValidationTimestamp) {
        const nextValidationDate = new Date(nextValidationTimestamp);
        console.log(`Next token validation scheduled for: ${nextValidationDate.toString()}`);
      } else {
        console.log('No token validation scheduled yet');
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'openPage') {
    chrome.tabs.create({ url: request.url });
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