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
import { migrateToMultiAI, migrateJobsToIndexedDB } from '../utils/migration';
import { AISettings, AIProvider } from '../types';
import * as tokenService from '../utils/tokenService';
import { getAllJobs } from '../utils/indexedDB';

const aiService = new AIService();

async function initAIService() {
  await migrateToMultiAI();
  await migrateJobsToIndexedDB();
  const result = await chrome.storage.local.get(['aiSettings']);
  const settings = result.aiSettings as AISettings;

  if (settings) {
    settings.providers.forEach((p: AIProvider) => {
      if (p.id === 'gemini') aiService.registerProvider(new GeminiProvider(p));
      if (p.id === 'claude') aiService.registerProvider(new ClaudeProvider(p));
      if (p.id === 'openai') aiService.registerProvider(new OpenAIProvider(p));
    });
  }
}

// Function to initialize job count from IndexedDB
async function initJobCount() {
  try {
    const jobs = await getAllJobs();
    const today = new Date().toISOString().split('T')[0];
    const todaysJobs = jobs.filter(job => job.appliedDate && job.appliedDate.startsWith(today));
    await chrome.storage.local.set({ jobCount: todaysJobs.length });
    console.log(`Background: Initialized job count: ${todaysJobs.length} jobs for ${today} (Total in DB: ${jobs.length})`);
    if (jobs.length > 0) {
      console.log('Last 3 jobs in DB:', jobs.slice(0, 3).map(j => ({ id: j.id, date: j.appliedDate })));
    }
  } catch (error) {
    console.error('Background: Error initializing job count:', error);
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
      iconUrl: 'laaa_logo_128x128.png',
      title: 'API Token Invalid',
      message: 'Please update your API token to continue using AI features.',
      priority: 2
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
      iconUrl: 'laaa_logo_128x128.png',
      title: 'API Token Expired',
      message: 'Your API token has expired. Please renew it to continue using AI features.',
      priority: 2
    });
  } else if (diffDays <= 7) {
    chrome.notifications.create('token-expiring', {
      type: 'basic',
      iconUrl: 'laaa_logo_128x128.png',
      title: 'API Token Expiring Soon',
      message: `Your API token will expire in ${diffDays} days. Please renew it soon.`,
      priority: 1
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
    iconUrl: 'laaa_logo_128x128.png',
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
initJobCount();

function notifyAIFailure(error: any) {
  console.error('AI Request failed after all attempts:', error);
  
  chrome.notifications.create('ai-failure', {
    type: 'basic',
    iconUrl: 'laaa_logo_128x128.png',
    title: 'AI Service Issue',
    message: 'The AI service is having trouble. Please check your AI settings and API keys, or contact support: tools.qerds@gmail.com',
    priority: 2
  });
}

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (request.action === 'fetchToken') {
    const token = request.token as string;
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

  if (request.action === 'saveAppliedJob') {
    const jobData = request.job;
    console.log('Background: Received saveAppliedJob request for:', jobData.jobTitle);
    
    // Save to IndexedDB
    import('../utils/indexedDB').then(({ saveJob, getAllJobs }) => {
      saveJob(jobData).then(() => {
        console.log('Background: Successfully saved job to IndexedDB');
        
        // Update job count
        getAllJobs().then(jobs => {
          const today = new Date().toISOString().split('T')[0];
          const todaysJobs = jobs.filter(job => job.appliedDate && job.appliedDate.startsWith(today));
          chrome.storage.local.set({ jobCount: todaysJobs.length });
          console.log(`Background: Updated job count after save: ${todaysJobs.length} jobs for ${today}`);
        }).catch(err => console.error('Error updating job count after save:', err));
        
      }).catch(err => {
        console.error('Background: Error saving job to IndexedDB:', err);
      });
    }).catch(err => console.error('Failed to import indexedDB utils:', err));
    
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'updateJobCount') {
    // Update job count by fetching from IndexedDB
    getAllJobs().then(jobs => {
      const today = new Date().toISOString().split('T')[0];
      console.log(`Background: updateJobCount called. Total jobs in DB: ${jobs.length}. Today: ${today}`);
      
      const todaysJobs = jobs.filter(job => {
        const matches = !!(job.appliedDate && job.appliedDate.startsWith(today));
        if (jobs.length < 10) {
           console.log(`Job ${job.id}: appliedDate=${job.appliedDate}, matches today=${matches}`);
        }
        return matches;
      });
      
      chrome.storage.local.set({ jobCount: todaysJobs.length });
      console.log(`Updated job count: ${todaysJobs.length} jobs for ${today}`);
    }).catch(error => {
      console.error('Error updating job count:', error);
    });
    return true;
  }

  if (request.action === 'checkJobMatch') {
    const { jobDetails, resume } = request as { jobDetails: any; resume: string };
    console.log('Received checkJobMatch request for:', jobDetails.jobTitle);

    // Check if AI settings exist and at least one provider is enabled
    chrome.storage.local.get(['aiSettings'], (result) => {
      const aiSettings = result.aiSettings;
      if (!aiSettings || !aiSettings.providers || aiSettings.providers.length === 0) {
        sendResponse({ success: false, error: 'No AI settings configured' });
        return;
      }

      const hasEnabledProvider = aiSettings.providers.some((provider: any) => provider.enabled && provider.apiKey);
      if (!hasEnabledProvider) {
        sendResponse({ success: false, error: 'No AI provider enabled with API key' });
        return;
      }

      handleJobMatch(jobDetails, resume)
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error) => {
          console.error('Error in checkJobMatch:', error);
          notifyAIFailure(error);
          sendResponse({ success: false, error: error.message || 'Unknown error' });
        });
    });
    return true; // Keep channel open
  }

  if (request.action === 'answerJobQuestions') {
    const { inputs, radios, dropdowns, checkboxes, resume } = request as {
      inputs: any[];
      radios: any[];
      dropdowns: any[];
      checkboxes: any[];
      resume: string;
    };
    console.log('Received answerJobQuestions request');

    // Check if AI settings exist and at least one provider is enabled
    chrome.storage.local.get(['aiSettings'], (result) => {
      const aiSettings = result.aiSettings;
      if (!aiSettings || !aiSettings.providers || aiSettings.providers.length === 0) {
        sendResponse({ success: false, error: 'No AI settings configured' });
        return;
      }

      const hasEnabledProvider = aiSettings.providers.some((provider: any) => provider.enabled && provider.apiKey);
      if (!hasEnabledProvider) {
        sendResponse({ success: false, error: 'No AI provider enabled with API key' });
        return;
      }

      handleQuestionAnswering(inputs, radios, dropdowns, checkboxes, resume)
        .then((data) => {
          sendResponse({ success: true, data });
        })
        .catch((error) => {
          console.error('Error in answerJobQuestions:', error);
          notifyAIFailure(error);
          sendResponse({ success: false, error: error.message || 'Unknown error' });
        });
    });
    return true; // Keep channel open
  }

  if (request.action === 'filterCompanies') {
    const { companies } = request as { companies: string[] };
    console.log('Received filterCompanies request for', companies.length, 'companies');

    // Check if AI settings exist and at least one provider is enabled
    chrome.storage.local.get(['aiSettings'], (result) => {
      const aiSettings = result.aiSettings;
      if (!aiSettings || !aiSettings.providers || aiSettings.providers.length === 0) {
        sendResponse({ success: false, error: 'No AI settings configured' });
        return;
      }

      const hasEnabledProvider = aiSettings.providers.some((provider: any) => provider.enabled && provider.apiKey);
      if (!hasEnabledProvider) {
        sendResponse({ success: false, error: 'No AI provider enabled with API key' });
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
    const { prompt } = request as { prompt: string };
    
    // Check if AI settings exist and at least one provider is enabled
    chrome.storage.local.get(['aiSettings'], (result) => {
      const aiSettings = result.aiSettings;
      if (!aiSettings || !aiSettings.providers || aiSettings.providers.length === 0) {
        sendResponse({ success: false, error: 'No AI settings configured' });
        return;
      }

      const hasEnabledProvider = aiSettings.providers.some((provider: any) => provider.enabled && provider.apiKey);
      if (!hasEnabledProvider) {
        sendResponse({ success: false, error: 'No AI provider enabled with API key' });
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

async function handleCompanyFiltering(companies: string[]): Promise<{ product_companies: any[], service_companies: any[] }> {
  const promptText = 'Find the company category(product based or service based also mention their industries and add a parameter is_it as (true or false, based on IT or non-IT) and output as {"product_companies": [{"company_name":"","industry":"", is_it: true}], "service_companies": [...]} for the below companies: ' + JSON.stringify(companies);

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


async function handleJobMatch(jobDetails: any, resume: string): Promise<any> {
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
): Promise<{
  inputs: Record<string, string>;
  dropdowns: Record<string, string>;
  radios: Record<string, string>;
  checkboxes: Record<string, string>;
}> {

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