// Import utility functions
import { addDelay, addShortDelay, addVeryShortDelay } from '../utils/delay';
import { handleEasyApplyModal } from './applyHandler';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { demoService } from '../services/demoService';
import { DemoManager } from '../components/demo/DemoManager';
import { DemoButton } from '../components/DemoButton';
import '../components/demo/demo.css';
import { FIRST_INSTALL_DEMO, SIDEBAR_DEMO } from '../constants/demoSteps';


// Constants
const API_TOKEN_KEY = 'apiToken';
const STATE_KEY = 'jobApplicationState';

// Interfaces
interface JobConfig {
  id: string;
  jobTitleName: string;
  jobConfigTimer: string;
  locations: Array<{
    id: string;
    locationName: string;
    locationTimer: string;
  }>;
  jobTypes: Array<{
    id: string;
    jobTypeName: string;
    jobTypeTimer: string;
  }>;
  workplaceTypes: Array<{
    id: string;
    workplaceTypeName: string;
    workplaceTypeTimer: string;
  }>;
}

interface AutoApplyState {
  isRunning: boolean;
  isPaused: boolean;
  jobIndex: number;
  locationIndex: number;
  typeIndex: number;
  workplaceIndex: number;
  startTime: number;     // Timestamp when current segment started
  segmentDuration: number; // Total duration intended for this segment in ms
  configs: JobConfig[];  // Store configs for easy access
}

// Global variables
let mainButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let pauseButton: HTMLButtonElement | null = null;
let timerButton: HTMLButtonElement | null = null;
let timerInterval: number | null = null;
let segmentTimeout: number | null = null;
let currentState: AutoApplyState | null = null;

// Helper to parse timer string (e.g. "10", "10m", "10 min", "1h") to milliseconds
function parseTimerToMs(timerStr: string): number {
  if (!timerStr) return 0;
  const lower = timerStr.toLowerCase().trim();

  // Check for hours
  if (lower.includes('h')) {
    const val = parseFloat(lower.replace(/[^0-9.]/g, ''));
    return isNaN(val) ? 0 : val * 60 * 60 * 1000;
  }

  // Default to minutes (or explicit 'm')
  const val = parseFloat(lower.replace(/[^0-9.]/g, ''));
  return isNaN(val) ? 0 : val * 60 * 1000;
}

// Helper to map job type name to LinkedIn f_JT code
function mapJobType(typeName: string): string {
  if (!typeName) return '';
  const lower = typeName.toLowerCase();

  if (lower.includes('full')) return 'F';
  if (lower.includes('part')) return 'P';
  if (lower.includes('contract')) return 'C';
  if (lower.includes('temp')) return 'T';
  if (lower.includes('intern')) return 'I';
  if (lower.includes('volunteer')) return 'V';
  if (lower.includes('other')) return 'O';

  return ''; // Default or no filter
}

// Helper to map workplace type name to LinkedIn f_WT code
function mapWorkplaceType(typeName: string): string {
  if (!typeName) return '';
  const lower = typeName.toLowerCase();

  if (lower === 'onsite') return '1';
  if (lower === 'remote') return '2';
  if (lower === 'hybrid') return '3';

  return ''; // Default or no filter
}

// --- State Management ---

async function loadState(): Promise<AutoApplyState | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STATE_KEY], (result) => {
      resolve(result[STATE_KEY] || null);
    });
  });
}

function saveState(state: AutoApplyState) {
  currentState = state;
  chrome.storage.local.set({ [STATE_KEY]: state });
}

function clearState() {
  currentState = null;
  chrome.storage.local.remove(STATE_KEY);
}

// --- Main Initialization ---

function initExtensionUI(): void {
  // Check if we have an active state to resume
  loadState().then(state => {
    currentState = state;

    // Always create the start button if we are on a job page
    if (isLinkedInPage()) {
      initAutoApplyUI();

      // Initialize Demo
      initializeDemo();

      // If we are running and not paused, resume logic
      if (state && state.isRunning) {
        resumeAutoApplyProcess(state);
      }
    }
  });
}

async function initializeDemo() {
  const shouldShow = await demoService.shouldShowFirstInstallDemo();

  if (shouldShow) {
    showDemo(FIRST_INSTALL_DEMO);
  }
}

function showDemo(flow: any) {
  const container = document.createElement('div');
  container.id = 'ai-job-applier-demo-root';
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(
    React.createElement(DemoManager, {
      flow,
      onComplete: () => {
        setTimeout(() => {
          root.unmount();
          container.remove();
        }, 300);
      }
    })
  );
}

function addDemoButtonToSidebar() {
  const sidebar = document.body; // or a more specific container if available
  const demoContainer = document.createElement('div');
  demoContainer.id = 'ai-job-applier-demo-button-root';
  demoContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 260px;
    z-index: 9999;
    display: none;
  `;

  document.body.appendChild(demoContainer);

  const root = ReactDOM.createRoot(demoContainer);
  root.render(
    React.createElement(DemoButton, {
      onStartDemo: () => showDemo(SIDEBAR_DEMO)
    })
  );
}

function isLinkedInPage(): boolean {
  return window.location.hostname.includes('linkedin.com');
}

function initAutoApplyUI(): void {
  // Prevent duplicate buttons
  if (document.getElementById('auto-apply-main-button')) return;

  mainButton = document.createElement('button');
  mainButton.id = 'auto-apply-main-button';
  mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
    </svg>
  `;

  styleMainButton(mainButton);

  mainButton.addEventListener('click', () => {
    // If not running, start fresh
    if (!currentState || !currentState.isRunning) {
      startNewAutoApplyProcess();
    }
  });

  document.body.appendChild(mainButton);

  // Add the demo button too
  addDemoButtonToSidebar();
}

function styleMainButton(btn: HTMLButtonElement) {
  btn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: #4CAF50;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

  // Hover effects
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
}

// --- process Control ---

async function startNewAutoApplyProcess() {
  console.log('Starting new auto-apply process...');

  // Check if token is valid before starting
  const isTokenValid = await checkTokenValidity();

  if (!isTokenValid) {
    // Show notification about invalid token
    chrome.runtime.sendMessage({
      action: 'showNotification',
      notification: {
        type: 'basic',
        title: 'API Token Required',
        message: 'Please update your API token to continue using AI features.',
        iconUrl: '128128.png'
      }
    });

    // Open settings page
    chrome.runtime.sendMessage({
      action: 'openPage',
      url: chrome.runtime.getURL('settings.html#settings')
    });

    return;
  }

  // 1. Fetch configs
  const result = await chrome.storage.local.get(['jobConfigs']);
  const configs: JobConfig[] = result.jobConfigs || [];

  // Enhanced Validation: Must have at least one config with at least one location and one job title
  const isValid = configs.length > 0 && configs.every(c =>
    c.jobTitleName.trim() !== '' &&
    c.locations && c.locations.length > 0 &&
    c.locations.every(l => l.locationName.trim() !== '' && l.locationTimer.trim() !== '' && !isNaN(parseFloat(l.locationTimer)))
  );

  if (!isValid) {
    alert('Configuration Error:\nAt least one Job Title and one Location with a valid Timer are required for the extension to work.\n\nOpening Search and Timer Configuration...');
    chrome.runtime.sendMessage({
      action: 'openPage',
      url: chrome.runtime.getURL('settings.html#search-timer')
    });
    return;
  }

  // 2. Initialize State
  const newState: AutoApplyState = {
    isRunning: true,
    isPaused: false,
    jobIndex: 0,
    locationIndex: 0,
    typeIndex: 0,
    workplaceIndex: 0,
    startTime: Date.now(),
    segmentDuration: 0, // Will be calculated
    configs: []
  };

  // Calculate duration for first segment
  newState.segmentDuration = calculateSegmentDuration(configs, 0, 0, 0, 0);
  newState.configs = configs;

  saveState(newState);

  // 3. Trigger Redirect/Start
  processCurrentSegment(newState, configs);
}

async function resumeAutoApplyProcess(state: AutoApplyState) {
  console.log('Resuming auto-apply process...', state);

  if (state.isPaused) {
    // Show UI in paused state
    showLoadingState();
    createControlButtons();
    if (pauseButton) {
      // Update pause button to show play icon
      updatePauseButtonUI(true);
    }
    return;
  }

  const result = await chrome.storage.local.get(['jobConfigs']);
  const configs: JobConfig[] = result.jobConfigs || [];

  if (!configs.length) {
    console.error('No configs found during resume');
    stopAutoApplyProcess();
    return;
  }

  processCurrentSegment(state, configs);
}

function calculateSegmentDuration(configs: JobConfig[], jIdx: number, lIdx: number, tIdx: number, wIdx: number): number {
  const jobConfig = configs[jIdx];
  if (!jobConfig) return 5 * 60 * 1000; // default safe fallback

  const defaultDuration = 10 * 60 * 1000; // 10 mins default

  // Hierarchy (Most specific to least specific): Location > Job Type > Workplace Type > Job Config
  let timerStr = '';

  // 1. Check if locations are present and valid
  const hasLocations = jobConfig.locations && jobConfig.locations.some(l => l.locationName || l.locationTimer);
  if (hasLocations && jobConfig.locations[lIdx]) {
    timerStr = jobConfig.locations[lIdx].locationTimer;
  }

  // 2. If no location timer, check job types
  if (!timerStr) {
    const hasJobTypes = jobConfig.jobTypes && jobConfig.jobTypes.some(jt => jt.jobTypeName || jt.jobTypeTimer);
    if (hasJobTypes && jobConfig.jobTypes[tIdx]) {
      timerStr = jobConfig.jobTypes[tIdx].jobTypeTimer;
    }
  }

  // 3. If still no timer, check workplace types
  if (!timerStr) {
    const hasWorkplaceTypes = jobConfig.workplaceTypes && jobConfig.workplaceTypes.some(wt => wt.workplaceTypeName || wt.workplaceTypeTimer);
    if (hasWorkplaceTypes && jobConfig.workplaceTypes[wIdx]) {
      timerStr = jobConfig.workplaceTypes[wIdx].workplaceTypeTimer;
    }
  }

  // 4. Finally, fallback to global job config timer
  if (!timerStr) {
    timerStr = jobConfig.jobConfigTimer;
  }

  const duration = parseTimerToMs(timerStr);
  return duration > 0 ? duration : defaultDuration;
}

function processCurrentSegment(state: AutoApplyState, configs: JobConfig[]) {
  // Validate indices
  if (state.jobIndex >= configs.length) {
    console.log('All job configurations completed.');
    stopAutoApplyProcess();
    return;
  }

  const jobConfig = configs[state.jobIndex];

  // Handle empty locations/types by treating them as a single item array of "any"
  const locations = (jobConfig.locations && jobConfig.locations.length > 0)
    ? jobConfig.locations
    : [{ locationName: '', locationTimer: '' }];

  const jobTypes = (jobConfig.jobTypes && jobConfig.jobTypes.length > 0)
    ? jobConfig.jobTypes
    : [{ jobTypeName: '', jobTypeTimer: '' }];

  const workplaceTypes = (jobConfig.workplaceTypes && jobConfig.workplaceTypes.length > 0)
    ? jobConfig.workplaceTypes
    : [{ workplaceTypeName: '', workplaceTypeTimer: '' }];

  if (state.locationIndex >= locations.length) {
    // Move to next job config
    state.jobIndex++;
    state.locationIndex = 0;
    state.typeIndex = 0;
    state.workplaceIndex = 0;
    saveState(state);
    processCurrentSegment(state, configs);
    return;
  }

  if (state.workplaceIndex >= workplaceTypes.length) {
    // Move to next location
    state.locationIndex++;
    state.workplaceIndex = 0;
    state.typeIndex = 0;
    saveState(state);
    processCurrentSegment(state, configs);
    return;
  }

  if (state.typeIndex >= jobTypes.length) {
    // Move to next workplace type
    state.workplaceIndex++;
    state.typeIndex = 0;
    saveState(state);
    processCurrentSegment(state, configs);
    return;
  }

  // Determine current params
  const targetTitle = jobConfig.jobTitleName;
  const targetLocation = locations[state.locationIndex].locationName; // Can be empty if using default
  const targetType = jobTypes[state.typeIndex].jobTypeName;     // Can be empty
  const targetWorkplace = workplaceTypes[state.workplaceIndex].workplaceTypeName; // Can be empty

  // Construct search URL
  const targetUrl = constructSearchUrl(targetTitle, targetLocation, targetType, targetWorkplace);

  // Check if we are already on this URL parameter set
  if (!isCurrentUrlMatching(targetUrl)) {
    if (window.location.pathname.includes('/jobs/view/')) {
      console.log('On job view page, going back to search');
      window.history.back();
    } else {
      console.log('Redirecting to match config:', { targetTitle, targetLocation, targetType });
      window.location.href = targetUrl;
    }
    return;
  }

  // We are on the correct page. Start Logic.
  showLoadingState();
  createControlButtons();

  // Calculate remaining time
  const now = Date.now();
  const elapsed = now - state.startTime;
  const remaining = state.segmentDuration - elapsed;

  if (remaining <= 0) {
    console.log('Timer finished for current segment. Moving next.');
    moveToNextSegment(state, configs);
    return;
  }

  console.log(`Starting/Resuming segment. Remaining: ${Math.round(remaining / 1000)}s`);
  startTimerDisplay(remaining);

  // Set limit timeout
  if (segmentTimeout) clearTimeout(segmentTimeout);
  segmentTimeout = window.setTimeout(() => moveToNextSegment(state, configs), remaining);

  // Start the actual applying loop
  runAutoApplyProcess();
}

function constructSearchUrl(keywords: string, location: string, jobType: string, workplace: string): string {
  const baseUrl = 'https://www.linkedin.com/jobs/search/';
  const params = new URLSearchParams(window.location.search); // Start with current params

  // Always set keywords and location to match user configuration, overriding existing ones
  if (keywords) {
    params.set('keywords', keywords);
  } else {
    params.delete('keywords');
  }

  if (location) {
    params.set('location', location);
  } else {
    params.delete('location');
  }

  const f_JT = mapJobType(jobType);
  if (f_JT) {
    params.set('f_JT', f_JT);
  }

  const f_WT = mapWorkplaceType(workplace);
  if (f_WT) {
    params.set('f_WT', f_WT);
  }

  // Always set f_AL=true (Easy Apply)
  params.set('f_AL', 'true');

  // Reset pagination but keep other parameters
  params.set('start', '0');

  // Remove geoId and currentJobId if they exist
  params.delete('geoId');
  params.delete('currentJobId');

  return `${baseUrl}?${params.toString()}`;
}

function preserveCustomSearchParams(targetUrl: string): string {
  // Preserve ALL search parameters from current URL when constructing target URL
  // This ensures we keep all user's custom search filters
  const currentUrl = new URL(window.location.href);
  const target = new URL(targetUrl);

  // Copy ALL parameters from current URL to target URL
  for (const [key, value] of currentUrl.searchParams.entries()) {
    // Don't override the core search parameters that we explicitly set
    if (!target.searchParams.has(key)) {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
}

function isCurrentUrlMatching(targetUrl: string): boolean {
  // More flexible check: do essential path and query params match?
  const currentUrl = new URL(window.location.href);
  const target = new URL(targetUrl);
  console.log('Current URL:', currentUrl.pathname);
  console.log('Target URL:', target.pathname);

  // Check if we're on the same base path
  if (currentUrl.pathname !== target.pathname) {
    return false;
  }

  // Check if essential parameters match
  const essentialKeys = ['keywords', 'location', 'f_AL'];

  for (const key of essentialKeys) {
    const targetVal = target.searchParams.get(key);
    const currentVal = currentUrl.searchParams.get(key);
    console.log(`Comparing param "${key}": target="${targetVal}", current="${currentVal}"`);

    // Normalize null/empty
    const t = (targetVal || '').toLowerCase().trim();
    const c = (currentVal || '').toLowerCase().trim();

    if (t !== c) {
      if(key === 'location'){
        return true;
      }
      
      return false;
    }
  }

  // Check workplace type only if specified in config
  // const targetWT = target.searchParams.get('f_WT') || '';
  // const currentWT = currentUrl.searchParams.get('f_WT') || '';
  // if (targetWT !== '' && targetWT !== currentWT) {
  //   return false;
  // }

  // Check job type only if specified in config
  // const targetJT = target.searchParams.get('f_JT') || '';
  // const currentJT = currentUrl.searchParams.get('f_JT') || '';
  // if (targetJT !== '' && targetJT !== currentJT) {
  //   return false;
  // }

  return true;
}

function moveToNextSegment(state: AutoApplyState, configs: JobConfig[]) {
  // Move to the next segment in the sequence:
  // 1. Next job type within current location
  // 2. Next location within current job config
  // 3. Next job config

  // Get current job config to access locations and job types
  const jobConfig = configs[state.jobIndex];
  const locations = (jobConfig.locations && jobConfig.locations.length > 0)
    ? jobConfig.locations
    : [{ locationName: '', locationTimer: '' }];

  const jobTypes = (jobConfig.jobTypes && jobConfig.jobTypes.length > 0)
    ? jobConfig.jobTypes
    : [{ jobTypeName: '', jobTypeTimer: '' }];

  const workplaceTypes = (jobConfig.workplaceTypes && jobConfig.workplaceTypes.length > 0)
    ? jobConfig.workplaceTypes
    : [{ workplaceTypeName: '', workplaceTypeTimer: '' }];

  // Increment location index first (Inner loop)
  state.locationIndex++;

  // If we've exhausted all locations, move to next job type
  if (state.locationIndex >= locations.length) {
    state.typeIndex++;
    state.locationIndex = 0;

    // If we've exhausted all job types, move to next workplace type
    if (state.typeIndex >= jobTypes.length) {
      state.workplaceIndex++;
      state.typeIndex = 0;

      // If we've exhausted all workplace types, move to next job config
      if (state.workplaceIndex >= workplaceTypes.length) {
        state.jobIndex++;
        state.workplaceIndex = 0;
      }
    }
  }

  state.startTime = Date.now(); // Reset start time for new segment

  // Calculate duration for the next segment
  state.segmentDuration = calculateSegmentDuration(configs, state.jobIndex, state.locationIndex, state.typeIndex, state.workplaceIndex);

  // Save and process
  saveState(state);

  // If we still have more segments, process them
  if (state.jobIndex < configs.length) {
    processCurrentSegment(state, configs);
  } else {
    // All done with current cycle
    console.log('All job configurations completed.');

    // Check if we should run in loop
    chrome.storage.local.get(['runInLoop'], (result) => {
      if (result.runInLoop) {
        console.log('Run in loop enabled. Restarting from beginning...');
        // Reset state to beginning
        state.jobIndex = 0;
        state.locationIndex = 0;
        state.typeIndex = 0;
        state.workplaceIndex = 0;
        state.startTime = Date.now();
        state.segmentDuration = calculateSegmentDuration(configs, 0, 0, 0, 0);
        saveState(state);
        processCurrentSegment(state, configs);
      } else {
        stopAutoApplyProcess();
      }
    });
  }
}

// --- Applying Logic (Refactored from original) ---


async function getDailyJobCount(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['appliedJobs'], (result) => {
      const today = new Date().toISOString().split('T')[0];
      const appliedJobs = result.appliedJobs || {};
      const jobs = appliedJobs[today] || [];
      resolve(jobs.length);
    });
  });
}

async function checkDailyLimit(): Promise<boolean> {
  const count = await getDailyJobCount();
  const limit = 50; // Hardcoded limit as per request similarity or could be config
  if (count >= limit) {
    console.log(`Daily limit of ${limit} jobs reached.`);
    alert(`Daily limit of ${limit} jobs reached. Stopping script.`);
    return true;
  }
  return false;
}

// --- Applying Logic (Refactored from original) ---


// --- Batch Processing Logic ---

async function scrollAndFetchAllJobs(): Promise<{ listItems: HTMLElement[], jobDetails: any[] }> {
  console.log('Scrolling and fetching all jobs...');

  // Instead of trying to find a container, let's directly find job items and scroll the whole page
  // This is a more robust approach that works regardless of LinkedIn's layout changes

  const jobCardSelectors = [
    '.jobs-search-results__list-item',
    '.job-card-container',
    'li[data-occludable-job-id]',
    '[data-view-name="job-card"]',
    '.scaffold-layout__list-container > li',
    '.jobs-search-results-list__list-item'
  ];

  let allJobItems: Element[] = [];
  let previousCount = 0;
  let noChangeCount = 0;
  const maxAttempts = 50; // Increase attempts
  let attempt = 0;

  console.log('Starting job discovery and scroll process...');

  // Scroll the entire page to load all jobs
  while (attempt < maxAttempts && noChangeCount < 15) {
    // Scroll down by a significant amount (80% of viewport height)
    window.scrollBy(0, window.innerHeight * 0.8);

    // Wait for content to load
    await addDelay();

    // Find all job items currently on the page
    let currentJobItems: Element[] = [];
    for (const selector of jobCardSelectors) {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        currentJobItems = Array.from(items);
        console.log(`Found ${items.length} job items with selector: ${selector}`);
        if (items.length > 10) break; // If we found a lot, this is probably the right selector
      }
    }

    console.log(`Attempt ${attempt + 1}: Found ${currentJobItems.length} job items`);

    // Update our collection of all job items (deduplicating as we go)
    const newItemIds = new Set(allJobItems.map(item => item.outerHTML));
    for (const item of currentJobItems) {
      const itemId = item.outerHTML;
      if (!newItemIds.has(itemId)) {
        allJobItems.push(item);
        newItemIds.add(itemId);
      }
    }

    // Check if we found more items
    if (allJobItems.length > previousCount) {
      previousCount = allJobItems.length;
      noChangeCount = 0;
      console.log(`Total unique job items so far: ${allJobItems.length}`);
    } else {
      noChangeCount++;
      console.log(`No new items found. No change count: ${noChangeCount}`);
    }

    // Check if we've reached the end of the page
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 100) {
      console.log('Reached end of page');
      break;
    }

    attempt++;
  }

  console.log(`Finished scrolling. Found ${allJobItems.length} total unique job items`);

  // One final scroll to make sure we got everything
  window.scrollTo(0, document.documentElement.scrollHeight);
  await addDelay();

  // Collect all job items one more time after final scroll
  for (const selector of jobCardSelectors) {
    const items = document.querySelectorAll(selector);
    if (items.length > allJobItems.length) {
      allJobItems = Array.from(items);
      console.log(`After final scroll, found ${allJobItems.length} job items with selector: ${selector}`);
      break;
    }
  }

  // Extract job details
  const jobDetails: any[] = [];
  const listItems: HTMLElement[] = [];

  // Sort items by vertical position
  const sortedItems = [...allJobItems].sort((a, b) => {
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
  });

  console.log(`Processing ${sortedItems.length} items`);

  for (const item of sortedItems) {
    // Scroll item into view to trigger lazy loading
    item.scrollIntoView({ behavior: 'auto', block: 'center' });
    await addVeryShortDelay();

    // Try multiple selectors for job title
    const titleSelectors = [
      '.job-card-list__title',
      '.artdeco-entity-lockup__title a',
      'a[data-control-name="job_card_title"]',
      'a[href*="/jobs/view/"]',
      '[data-job-title]',
      'h3 a',
      '.job-card-container__title',
      '.job-card-list__title--link',
      '.job-card-container__primary-description a'
    ];

    let titleEl: Element | null = null;
    for (const selector of titleSelectors) {
      titleEl = item.querySelector(selector);
      if (titleEl) break;
    }

    // Try multiple selectors for company name
    const companySelectors = [
      '.job-card-container__primary-description',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__company-name',
      'a[data-control-name="company_link"]',
      '.job-card-company-name',
      '[data-company-name]',
      '.job-card-container__secondary-description',
      '.artdeco-entity-lockup__metadata',
      '.job-card-container__company-name a'
    ];

    let companyEl: Element | null = null;
    for (const selector of companySelectors) {
      companyEl = item.querySelector(selector);
      if (companyEl) break;
    }

    const jobTitle = titleEl?.textContent?.trim() || '';
    const company = companyEl?.textContent?.trim() || '';

    if (jobTitle && company) {
      jobDetails.push({ listItem: item, jobTitle, company });
      listItems.push(item as HTMLElement);
      console.log(`Added job: ${jobTitle} at ${company}`);
    } else {
      console.log(`Skipped job. Title: "${jobTitle}", Company: "${company}"`);
      if (!jobTitle && !company) {
        console.log('Item HTML (first 200 chars):', item.outerHTML.substring(0, 200));
      }
    }
  }

  console.log(`Successfully extracted details for ${jobDetails.length} jobs`);
  return { listItems, jobDetails };
}

async function filterJobsByCompanyType(jobDetails: any[]): Promise<any[]> {
  const companies = [...new Set(jobDetails.map(j => j.company))];
  console.log(`Filtering ${companies.length} unique companies...`);

  const storage = await chrome.storage.local.get([
    'applyToProductCompanies',
    'applyToServiceCompanies',
    'apiToken'
  ]);

  const applyProduct = storage.applyToProductCompanies !== undefined ? storage.applyToProductCompanies : true;
  const applyService = storage.applyToServiceCompanies !== undefined ? storage.applyToServiceCompanies : true;

  // If both true, no need to filter expensive AI call (unless we strictly want to know type)
  if (applyProduct && applyService) {
    console.log('Applying to all company types, skipping filter.');
    return jobDetails;
  }

  const token = storage.apiToken;
  if (!token) {
    console.warn('No API token found for company filtering. Defaulting to all.');
    return jobDetails;
  }

  try {
    const response: any = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'filterCompanies',
        companies,
        token: token // Updated param name to match background expected input if needed
      }, (res) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else if (res && res.success) resolve(res.data);
        else reject(res?.error);
      });
    });

    const productCompanies = response.product_companies || [];
    const serviceCompanies = response.service_companies || [];

    console.log('AI Classification:', { productCompanies, serviceCompanies });

    const productNames = productCompanies.map((c: any) => c.company_name.toLowerCase());
    const serviceNames = serviceCompanies.map((c: any) => c.company_name.toLowerCase());

    return jobDetails.filter(job => {
      const c = job.company.toLowerCase();
      const isProduct = productNames.some((n: string) => c.includes(n));
      const isService = serviceNames.some((n: string) => c.includes(n));

      if (applyProduct && isProduct) return true;
      if (applyService && isService) return true;

      // If unknown, maybe default include? Or exclude? 
      // Let's include if it didn't match either just to be safe, or strict?
      // "based on our setting product or service we select each job"
      // If strict:
      return false;
    });

  } catch (e) {
    console.error('Company filter failed', e);
    return jobDetails; // Fallback
  }
}

async function runAutoApplyProcess() {
  if (!currentState || !currentState.isRunning || currentState.isPaused) return;

  // Verify URL matching (Strict enforcement of f_AL=true and other mandatory filters)
  const jobConfig = currentState.configs[currentState.jobIndex];
  if (jobConfig) {
    const locations = (jobConfig.locations && jobConfig.locations.length > 0)
      ? jobConfig.locations
      : [{ locationName: '', locationTimer: '' }];
    const jobTypes = (jobConfig.jobTypes && jobConfig.jobTypes.length > 0)
      ? jobConfig.jobTypes
      : [{ jobTypeName: '', jobTypeTimer: '' }];
    const workplaceTypes = (jobConfig.workplaceTypes && jobConfig.workplaceTypes.length > 0)
      ? jobConfig.workplaceTypes
      : [{ workplaceTypeName: '', workplaceTypeTimer: '' }];

    const targetUrl = constructSearchUrl(
      jobConfig.jobTitleName,
      locations[currentState.locationIndex].locationName,
      jobTypes[currentState.typeIndex].jobTypeName,
      workplaceTypes[currentState.workplaceIndex].workplaceTypeName
    );

    if (!isCurrentUrlMatching(targetUrl)) {
      console.log('URL mismatch detected while running (f_AL=true might be missing). Redirecting...');
      window.location.href = targetUrl;
      return;
    }
  }

  // Check limit
  if (await checkDailyLimit()) {
    stopAutoApplyProcess();
    return;
  }

  // 1. Scroll and Batch Fetch
  const { jobDetails: allJobs } = await scrollAndFetchAllJobs();

  if (allJobs.length === 0) {
    console.log('No jobs found. Waiting...');
    await addDelay();
    if (currentState && currentState.isRunning) {
      requestAnimationFrame(runAutoApplyProcess);
    }
    return;
  }

  // 2. Filter by Company Type
  const filteredJobs = await filterJobsByCompanyType(allJobs);
  console.log(`Filtered down to ${filteredJobs.length} jobs from ${allJobs.length}`);

  // 3. Apply Loop
  // 3. Apply Loop
  console.log(`Starting processing of ${filteredJobs.length} jobs...`);

  for (let i = 0; i < filteredJobs.length; i++) {
    const job = filteredJobs[i];

    if (!currentState || !currentState.isRunning) {
      console.log('State check failed (stopped/paused). Breaking loop.');
      break;
    }

    while (currentState && currentState.isPaused) {
      console.log('Paused. Waiting...');
      await new Promise(r => setTimeout(r, 1000));
      if (!currentState || !currentState.isRunning) break;
    }

    if (!currentState || !currentState.isRunning) break;

    await processSingleJob(job, i, filteredJobs.length);
    await addShortDelay();
  }

  console.log('Finished current batch. Waiting/Reloading...');
  // Logic to go to next page?
  // User ref code had `goToNextPage`
  await goToNextPage();
}

async function goToNextPage() {
  const nextButton = document.querySelector('.jobs-search-pagination__button--next') as HTMLElement;
  if (nextButton) {
    console.log('Navigating to next page...');
    nextButton.click();
    await addDelay();
    if (currentState && currentState.isRunning) {
      runAutoApplyProcess();
    }
  } else {
    console.log('No next page found.');
    if (currentState) {
      moveToNextSegment(currentState, currentState.configs);
    } else {
      console.warn('Cannot move to next segment: no current state available.');
    }
    //stopAutoApplyProcess();
  }
}


// --- Helpers reused/preserved ---

async function fetchJobDetails(): Promise<any> {
  try {
    await addVeryShortDelay();
    const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
    const company = companyElement ? companyElement.textContent?.trim() : '';

    // Check ignore list
    const ignoreResult = await chrome.storage.local.get(['ignoreCompanies']);
    const ignoreList = (ignoreResult.ignoreCompanies || '').split(',').map((s: string) => s.trim().toLowerCase());

    if (company && ignoreList.some((ig: string) => ig && company.toLowerCase().includes(ig))) {
      return false;
    }

    const jobTitleElement = document.querySelector('.t-24.job-details-jobs-unified-top-card__job-title h1 a');
    const jobTitle = jobTitleElement ? jobTitleElement.textContent?.trim() : '';

    // Extract job ID from the URL or job title link
    let jobId = null;

    // Try to get job ID from URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    jobId = urlParams.get('currentJobId');

    // If not in query params, try to extract from path
    if (!jobId) {
      const match = window.location.pathname.match(/\/jobs\/view\/(\d+)\//);
      if (match) {
        jobId = match[1];
      }
    }

    // If still no jobId, try to get it from the job title element href if it exists
    if (!jobId && jobTitleElement && jobTitleElement instanceof HTMLAnchorElement) {
      const href = jobTitleElement.href;
      if (href) {
        const hrefParams = new URLSearchParams(new URL(href).search);
        jobId = hrefParams.get('currentJobId');

        // If not in query params of href, try to extract from path
        if (!jobId) {
          const hrefMatch = href.match(/\/jobs\/view\/(\d+)\//);
          if (hrefMatch) {
            jobId = hrefMatch[1];
          }
        }
      }
    }

    // If still no jobId, try to get it from the Easy Apply button
    if (!jobId) {
      const easyApplyButton = document.querySelector('button[data-job-id]');
      if (easyApplyButton) {
        jobId = easyApplyButton.getAttribute('data-job-id');
      }
    }

    // Safe selectors for location
    const locationElement = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .t-black--light span:first-child span:first-child') ||
      document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .t-black--light span:first-child');
    const location = locationElement ? locationElement.textContent?.trim() : '';

    const descriptionElement = document.querySelector('#job-details');
    const description = descriptionElement ? descriptionElement.textContent?.trim() : '';

    return { jobTitle, company, location, description, jobId };
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function checkJobMatch(jobDetails: any): Promise<number | false> {
  const tokenRes = await chrome.storage.local.get(['accessToken', 'applyToProductCompanies', 'applyToServiceCompanies', 'minMatchScore', 'compressedResumeYAML', 'plainTextResume']);
  if (!tokenRes.accessToken) return false;

  // Default preferences
  const applyProduct = tokenRes.applyToProductCompanies !== undefined ? tokenRes.applyToProductCompanies : true;
  const applyService = tokenRes.applyToServiceCompanies !== undefined ? tokenRes.applyToServiceCompanies : true;
  const minScore = parseInt(tokenRes.minMatchScore || '3');
  const resume = tokenRes.compressedResumeYAML || tokenRes.plainTextResume || "Default Resume...";

  try {
    const response: any = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'checkJobMatch',
          jobDetails,
          resume,
          accessToken: tokenRes.accessToken
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response.data);
          } else {
            console.error(response);
            // Even if there's an error with the matching, we shouldn't necessarily skip the job
            // Instead, we'll return a neutral score that allows processing to continue
            resolve(null);
          }
        }
      );
    });

    // If we received null (error case), return a neutral score to allow continuation
    if (response === null) {
      console.log('Job matching service unavailable, proceeding with neutral score');
      return 3; // Return a middle score to allow processing
    }

    // Type check
    if (response.company_type) {
      const type = response.company_type.toLowerCase();
      if (type.includes('product') && !applyProduct) return false;
      if (type.includes('service') && !applyService) return false;
    }

    // Handle different response formats for match score
    let matchScore = null;

    // Try different possible response formats
    if (typeof response.match_score === 'string') {
      matchScore = parseInt(response.match_score);
    } else if (typeof response.match_score === 'number') {
      matchScore = Math.round(response.match_score);
    } else if (typeof response === 'string' && !isNaN(parseInt(response))) {
      matchScore = parseInt(response);
    } else if (typeof response === 'number') {
      matchScore = Math.round(response);
    } else if (response.matchScore) {
      matchScore = typeof response.matchScore === 'string' ? parseInt(response.matchScore) : response.matchScore;
    } else if (response.score) {
      matchScore = typeof response.score === 'string' ? parseInt(response.score) : response.score;
    }

    // If we couldn't parse a score, return a neutral one
    if (matchScore === null || isNaN(matchScore)) {
      console.log('Could not parse match score, using neutral score');
      return 3;
    }

    console.log(`Final match score: ${matchScore}, Minimum required: ${minScore}`);
    return matchScore >= minScore ? matchScore : false;

  } catch (e) {
    console.error('Match check error', e);
    // Even if there's an exception, we shouldn't necessarily skip the job
    // Return a neutral score to allow processing to continue
    return 3;
  }
}

async function applyToJob(jobDetails: any) {
  console.log(`-- applyToJob called for ${jobDetails.jobTitle} --`);
  console.log('Job details:', JSON.stringify(jobDetails, null, 2));

  try {
    console.log('Searching for Easy Apply buttons...');
    const buttons = Array.from(document.querySelectorAll('button'));
    const easyApplyButtons = buttons.filter(b => b.innerText.includes('Easy Apply'));

    console.log(`Found ${buttons.length} total buttons, ${easyApplyButtons.length} Easy Apply buttons`);

    if (easyApplyButtons.length > 0) {
      console.log(`Found ${easyApplyButtons.length} Easy Apply buttons.`);

      // Prefer the one in the jobs details top card if possible
      let targetBtn = easyApplyButtons.find(b => b.closest('.job-details-jobs-unified-top-card'));
      console.log('Button in job details top card found:', !!targetBtn);

      if (!targetBtn) {
        // Filter for visible buttons
        const visibleButtons = easyApplyButtons.filter(b => b.offsetParent !== null);
        console.log(`Found ${visibleButtons.length} visible Easy Apply buttons`);

        if (visibleButtons.length > 0) {
          // If multiple, picking the last one is often safer as the first might be the list item button?
          // The reference said index 1 (second button).
          targetBtn = visibleButtons.length > 1 ? visibleButtons[1] : visibleButtons[0];
          console.log('Selected button index:', visibleButtons.indexOf(targetBtn));
        }
      }

      if (targetBtn) {
        console.log('Clicking Easy Apply button:', targetBtn);
        console.log('Button details:', {
          text: targetBtn.innerText.trim(),
          classes: Array.from(targetBtn.classList),
          id: targetBtn.id
        });

        targetBtn.click();
        await addShortDelay();
        console.log('Invoking handleEasyApplyModal...');
        await handleEasyApplyModal(jobDetails, () => !currentState || !currentState.isRunning);
        console.log('handleEasyApplyModal returned.');
      } else {
        console.log('No actionable Easy Apply button found (none visible or relevant).');
      }
    } else {
      console.log('Easy Apply button not found for this job.');
    }
  } catch (e) {
    console.error('Error in applyToJob:', e);
  }
}

async function processSingleJob(jobDetails: any, index: number, total: number) {
  console.log(`\n=== Processing Job ${index + 1}/${total} ===`);
  console.log(`Target Job: ${jobDetails.jobTitle} at ${jobDetails.company}`);

  try {
    // Click the job card/list item
    console.log('Clicking job card...');
    const listItem = jobDetails.listItem as HTMLElement;

    // Ensure the element is visible and clickable
    listItem.scrollIntoView({ behavior: 'auto', block: 'center' });
    await addVeryShortDelay();

    // Try multiple methods to click the job
    let clicked = false;

    // Method 1: Find and click the job title link within the item (most reliable)
    const titleLink = listItem.querySelector('a[href*="/jobs/view/"]') ||
      listItem.querySelector('.job-card-list__title a') ||
      listItem.querySelector('.artdeco-entity-lockup__title a') ||
      listItem.querySelector('a[data-control-name="job_card_title"]');

    if (titleLink) {
      try {
        titleLink.scrollIntoView({ behavior: 'auto', block: 'center' });
        await addVeryShortDelay();
        (titleLink as HTMLElement).click();
        clicked = true;
        console.log('Clicked job title link');
      } catch (e) {
        console.log('Failed to click job title link', e);
      }
    }

    // Method 2: Click the list item directly
    if (!clicked) {
      try {
        listItem.click();
        clicked = true;
        console.log('Clicked list item directly');
      } catch (e) {
        console.log('Failed to click list item directly', e);
      }
    }

    // Method 3: Dispatch click event
    if (!clicked) {
      try {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        listItem.dispatchEvent(clickEvent);
        clicked = true;
        console.log('Dispatched click event on list item');
      } catch (e) {
        console.log('Failed to dispatch click event', e);
      }
    }

    if (!clicked) {
      throw new Error('Unable to click job card');
    }

    // Wait for job details to load and verify it's the correct job
    console.log('Waiting for job details pane to update...');
    let jobDetailsData: any = null;
    let retries = 0;
    const maxRetries = 30; // Increased retries
    const targetTitle = jobDetails.jobTitle.toLowerCase().trim();
    const targetCompany = jobDetails.company.toLowerCase().trim();

    // Wait for job details with timeout
    while (retries < maxRetries) {
      await addShortDelay();

      // Try to extract job details
      jobDetailsData = await extractJobDetails();

      if (jobDetailsData &&
        jobDetailsData.jobTitle &&
        jobDetailsData.company &&
        jobDetailsData.jobTitle.trim() !== '' &&
        jobDetailsData.company.trim() !== '') {

        const loadedTitle = jobDetailsData.jobTitle.toLowerCase().trim();
        const loadedCompany = jobDetailsData.company.toLowerCase().trim();

        // Verify it matches the target job
        const titleMatch = loadedTitle.includes(targetTitle) || targetTitle.includes(loadedTitle);
        const companyMatch = loadedCompany.includes(targetCompany) || targetCompany.includes(loadedCompany);

        console.log(`Comparing job details:`);
        console.log(`  Expected: "${targetTitle}" at "${targetCompany}"`);
        console.log(`  Got:      "${loadedTitle}" at "${loadedCompany}"`);
        console.log(`  Title match: ${titleMatch}, Company match: ${companyMatch}`);

        // Check for exact matches or strong partial matches
        if ((titleMatch && companyMatch) ||
          (loadedTitle === targetTitle && loadedCompany === targetCompany)) {
          console.log('Correct job details loaded!');
          break;
        }
      }

      retries++;
      console.log(`Retry ${retries}/${maxRetries} - Still waiting for correct job details to load...`);
    }

    if (!jobDetailsData || retries >= maxRetries) {
      console.log('Failed to load matching job details (timeout or mismatch). Skipping.');
      return;
    }

    console.log(`Details Loaded: ${jobDetailsData.jobTitle} at ${jobDetailsData.company}`);
    console.log('Matching against criteria...');

    // Check if job matches criteria
    const matchScore = await checkJobMatch(jobDetailsData);
    console.log(`Job match score: ${matchScore}`);

    // Only skip if we explicitly get false, not for other falsy values like null or 0
    if (matchScore === false) {
      console.log('Job does not match criteria. Skipping.');
      return;
    }

    // If we have a numeric score (including 0), check against minimum
    if (typeof matchScore === 'number') {
      // Check if match score meets minimum requirement
      const minScoreResult = await chrome.storage.local.get(['minMatchScore']);
      const minScore = parseInt(minScoreResult.minMatchScore || '3');
      console.log(`Minimum required score: ${minScore}, Actual score: ${matchScore}`);

      if (matchScore < minScore) {
        console.log(`Job match score (${matchScore}) below minimum (${minScore}). Skipping.`);
        return;
      }
    }

    console.log(`Job match score: ${matchScore}. Proceeding to apply...`);

    // Apply to the job
    await applyToJob(jobDetailsData);

  } catch (e) {
    console.error('Error processing job:', e);
  } finally {
    console.log(`=== Finished Job ${index + 1} ===`);
  }
}

async function extractJobDetails() {
  try {
    // Try multiple selectors for company name
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__primary-description-container a',
      '.jobs-unified-top-card__subtitle-primary-image a',
      '.jobs-unified-top-card__subtitle a',
      '[data-testid="jobs-details-page-subtitle-link"]',
      '.job-details-jobs-unified-top-card__primary-description a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-details__main-content .jobs-details-top-card__company-url a'
    ];

    let company = '';
    for (const selector of companySelectors) {
      const companyEl = document.querySelector(selector);
      if (companyEl) {
        company = companyEl.textContent?.trim() || '';
        if (company) break;
      }
    }

    // Try multiple selectors for job title
    const titleSelectors = [
      '.t-24.job-details-jobs-unified-top-card__job-title h1 a',
      '.jobs-unified-top-card__job-title a',
      '.jobs-unified-top-card__title a',
      '.t-24 a',
      'h1.t-24',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-details__main-content .jobs-details-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title'
    ];

    let jobTitle = '';
    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector);
      if (titleEl) {
        jobTitle = titleEl.textContent?.trim() || '';
        if (jobTitle) break;
      }
    }

    // Try multiple selectors for location
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .t-black--light span:first-child span:first-child',
      '.jobs-unified-top-card__primary-description-container span',
      '.jobs-unified-top-card__subtitle-primary-image',
      '.jobs-unified-top-card__subtitle',
      '.t-black--light span',
      '.job-details-jobs-unified-top-card__primary-description span',
      '.jobs-details__main-content .jobs-box__html-content',
      '.jobs-description__container',
      '.job-details-about-the-job-module'
    ];

    let location = '';
    for (const selector of locationSelectors) {
      const locationEl = document.querySelector(selector);
      if (locationEl) {
        const text = locationEl.textContent?.trim() || '';
        // Make sure it's not too long and doesn't contain obvious non-location text
        if (text && !text.includes('LinkedIn') && text.length < 100 && text.length > 1) {
          location = text;
          break;
        }
      }
    }

    // Try multiple selectors for job description
    const descriptionSelectors = [
      '#job-details',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.job-details-module',
      '.jobs-details__main-content .jobs-box__html-content',
      '.jobs-description__container',
      '.job-details-about-the-job-module'
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const descEl = document.querySelector(selector);
      if (descEl) {
        description = descEl.textContent?.trim() || '';
        if (description) break;
      }
    }

    // Try to get job ID
    let jobId = null;

    // Try from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    jobId = urlParams.get('currentJobId');

    // Try from URL path
    if (!jobId) {
      const match = window.location.pathname.match(/\/jobs\/view\/(\d+)\//);
      if (match) {
        jobId = match[1];
      }
    }

    // Try from job details element attributes
    if (!jobId) {
      const jobDetailsElement = document.querySelector('.job-details-jobs-unified-top-card');
      if (jobDetailsElement) {
        jobId = jobDetailsElement.getAttribute('data-entity-urn')?.split(':').pop() || null;
      }
    }

    // Return the collected data if we have at least a job title or company
    if (jobTitle || company) {
      return { jobTitle, company, location, description, jobId };
    }

    return null;
  } catch (e) {
    console.error('Error extracting job details:', e);
    return null;
  }
}

// --- UI Controls ---

function showLoadingState() {
  if (!mainButton) return;
  mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
    </svg>`;
  mainButton.style.backgroundColor = '#2196F3';
  mainButton.style.animation = 'rotate 1s linear infinite';

  // Inject style if needed
  if (!document.getElementById('auto-apply-anim')) {
    const s = document.createElement('style');
    s.id = 'auto-apply-anim';
    s.textContent = '@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
}

function createControlButtons() {
  if (stopButton) return; // Already created

  stopButton = createButton(90, '#f44336', `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>`);
  stopButton.addEventListener('click', stopAutoApplyProcess);

  pauseButton = createButton(140, '#FF9800', `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>`);
  pauseButton.addEventListener('click', togglePause);

  timerButton = createButton(190, '#2196F3', `<span id="timer-text" style="font-size: 12px; color:white; font-weight:bold;">--:--</span>`);
  timerButton.style.width = '60px'; // Override width
  timerButton.style.borderRadius = '20px';

  // Show help button
  const demoButton = document.getElementById('ai-job-applier-demo-button-root');
  if (demoButton) demoButton.style.display = 'block';
}

function createButton(rightOffset: number, color: string, html: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.innerHTML = html;
  btn.style.cssText = `position:fixed; top:20px; right:${rightOffset}px; width:40px; height:40px; border-radius:50%; background-color:${color}; border:none; cursor:pointer; box-shadow:0 4px 8px rgba(0,0,0,0.3); z-index:9999; display:flex; align-items:center; justify-content:center; transition:all 0.3s ease;`;
  if (color === '#2196F3') { // Timer button specific
    btn.style.width = '60px';
    btn.style.borderRadius = '20px';
  }
  document.body.appendChild(btn);
  return btn;
}

function stopAutoApplyProcess() {
  clearState();
  if (mainButton) {
    mainButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
    mainButton.style.backgroundColor = '#4CAF50';
    mainButton.style.animation = 'none';
  }
  removeControlUI();
  if (timerInterval) clearInterval(timerInterval);
  if (segmentTimeout) clearTimeout(segmentTimeout);
}

function togglePause() {
  if (!currentState) return;
  currentState.isPaused = !currentState.isPaused;

  // adjust start time if resuming so we don't lose time? 
  // Complexity: simpler to just let wall clock run or shift start time. 
  // For now, simple pause flag. (Timer keeps running in background in simple implementation, but logically we might want to extend end time).
  // Let's shift start time to "pause" the timer effectively.
  if (currentState.isPaused) {
    // Paused.
    if (segmentTimeout) clearTimeout(segmentTimeout);
    if (timerInterval) clearInterval(timerInterval);
  } else {
    // Resume. We need to recalculate remaining and reset timeout.
    // NOTE: This simple version doesn't "stretch" the timer.
    // To do it right: on pause save "remaining", on resume set "startTime" = now, "segmentDuration" = saved remaining.
    // Let's implement that for robustness.
    const now = Date.now();
    const elapsed = now - currentState.startTime;
    const remaining = currentState.segmentDuration - elapsed;

    currentState.segmentDuration = remaining > 0 ? remaining : 0;
    currentState.startTime = now;

    saveState(currentState);

    // Re-process to set timers
    loadState().then(s => {
      if (s) resumeAutoApplyProcess(s);
    });
  }

  updatePauseButtonUI(currentState.isPaused);
  saveState(currentState);
}

function updatePauseButtonUI(isPaused: boolean) {
  if (!pauseButton) return;
  if (isPaused) {
    pauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
  } else {
    pauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>`;
  }
}

function removeControlUI() {
  if (stopButton) { stopButton.remove(); stopButton = null; }
  if (pauseButton) { pauseButton.remove(); pauseButton = null; }
  if (timerButton) { timerButton.remove(); timerButton = null; }

  // Hide help button
  const demoButton = document.getElementById('ai-job-applier-demo-button-root');
  if (demoButton) demoButton.style.display = 'none';
}

function startTimerDisplay(initialRemainingMs: number) {
  if (timerInterval) clearInterval(timerInterval);

  let remaining = initialRemainingMs;
  const update = () => {
    if (remaining <= 0) {
      remaining = 0;
      if (timerInterval) clearInterval(timerInterval);
    }

    const seconds = Math.floor(remaining / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const text = document.getElementById('timer-text');
    if (text) text.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

    remaining -= 1000;

    // Save state progress occasionally (every ~5s) to avoid data loss
    // (Implicitly handled by loadState/saveState in flow but good for visual consistency)
  };

  update();
  timerInterval = window.setInterval(update, 1000);
}

// Global bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtensionUI);
} else {
  initExtensionUI();
}

// Add this function to check token validity before starting auto-apply
async function checkTokenValidity(): Promise<boolean> {
  // Log the next scheduled validation time
  chrome.runtime.sendMessage({ action: 'logNextValidationTime' }, () => { });

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'checkTokenValidity' }, (response) => {
      resolve(response?.valid ?? false);
    });
  });
}

// Modify the main auto-apply function to check token first
async function startAutoApply() {
  // Check if token is valid before starting
  const isTokenValid = await checkTokenValidity();

  if (!isTokenValid) {
    // Show notification about invalid token
    chrome.runtime.sendMessage({
      action: 'showNotification',
      notification: {
        type: 'basic',
        title: 'API Token Required',
        message: 'Please update your API token to continue using AI features.',
        iconUrl: '128128.png'
      }
    });

    // Open settings page
    chrome.runtime.sendMessage({
      action: 'openPage',
      url: chrome.runtime.getURL('settings.html#settings')
    });

    return;
  }

  // Existing auto-apply logic continues here...
}
