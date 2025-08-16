// Import utility functions
import { addDelay, addShortDelay, addVeryShortDelay } from '../utils/delay';

// Constants
const API_TOKEN_KEY = 'apiToken';

// Global variables for the auto-apply functionality
let runningScript = false;
let isPaused = false;
let timerInterval: number | null = null;
let mainButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let pauseButton: HTMLButtonElement | null = null;
let timerButton: HTMLButtonElement | null = null;
let isLoading = false;

// Function to check if we're on a LinkedIn page
function isLinkedInPage(): boolean {
  return window.location.hostname.includes('linkedin.com');
}

// Function to initialize the extension UI
function initExtensionUI(): void {
  if (isLinkedInPage() && window.location.pathname.includes('/jobs/')) {
    // Initialize the auto-apply UI
    initAutoApplyUI();
  }
}

// Function to initialize the auto-apply UI
function initAutoApplyUI(): void {
  // Create the main circular button
  mainButton = document.createElement('button');
  mainButton.id = 'auto-apply-main-button';
  mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
    </svg>
  `;
  
  // Style the main button
  mainButton.style.cssText = `
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
  
  // Add hover effect
  mainButton.addEventListener('mouseenter', () => {
    if (mainButton) {
      mainButton.style.transform = 'scale(1.1)';
    }
  });
  
  mainButton.addEventListener('mouseleave', () => {
    if (mainButton) {
      mainButton.style.transform = 'scale(1)';
    }
  });
  
  // Add click event
  mainButton.addEventListener('click', async () => {
    if (!runningScript) {
      // Start the auto-apply process
      startAutoApplyProcess();
    }
  });
  
  // Add to document
  document.body.appendChild(mainButton);
  
  // Check token validity to set initial button color
  checkTokenValidity();
}

// Function to check token validity and update button color
async function checkTokenValidity() {
  try {
    // In a real implementation, this would check the actual token
    // For now, we'll simulate a valid token
    const isValid = true; // This would be the result of an actual token validation
    
    if (mainButton) {
      mainButton.style.backgroundColor = isValid ? '#4CAF50' : '#f44336';
    }
  } catch (error) {
    console.error('Error checking token validity:', error);
    if (mainButton) {
      mainButton.style.backgroundColor = '#f44336';
    }
  }
}

// Function to start the auto-apply process
async function startAutoApplyProcess() {
  if (!mainButton) return;
  
  runningScript = true;
  isPaused = false;
  
  // Change button to loading state
  showLoadingState();
  
  // Create control buttons
  createControlButtons();
  
  // Start timer
  startTimer(30000); // 30 seconds for demo
  
  // Simulate the auto-apply process
  await simulateAutoApplyProcess();
}

// Function to show loading state
function showLoadingState() {
  if (!mainButton) return;
  
  mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
    </svg>
  `;
  mainButton.style.backgroundColor = '#2196F3';
  
  // Add rotation animation
  mainButton.style.animation = 'rotate 1s linear infinite';
  
  // Add CSS for animation
  if (!document.getElementById('auto-apply-styles')) {
    const style = document.createElement('style');
    style.id = 'auto-apply-styles';
    style.textContent = `
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Function to create control buttons
function createControlButtons() {
  // Remove existing control buttons if any
  if (stopButton && stopButton.parentNode) {
    stopButton.parentNode.removeChild(stopButton);
  }
  if (pauseButton && pauseButton.parentNode) {
    pauseButton.parentNode.removeChild(pauseButton);
  }
  if (timerButton && timerButton.parentNode) {
    timerButton.parentNode.removeChild(timerButton);
  }
  
  // Create stop button
  stopButton = document.createElement('button');
  stopButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-stop-fill" viewBox="0 0 16 16">
      <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
    </svg>
  `;
  stopButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 90px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #f44336;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;
  
  stopButton.addEventListener('click', stopAutoApplyProcess);
  
  // Create pause button
  pauseButton = document.createElement('button');
  pauseButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
    </svg>
  `;
  pauseButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 140px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #FF9800;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;
  
  pauseButton.addEventListener('click', pauseAutoApplyProcess);
  
  // Create timer button
  timerButton = document.createElement('button');
  timerButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-clock-fill" viewBox="0 0 16 16">
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
    </svg>
    <span id="timer-text" style="margin-left: 5px; font-size: 12px;">0:30</span>
  `;
  timerButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 190px;
    width: 60px;
    height: 40px;
    border-radius: 20px;
    background-color: #2196F3;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    padding: 0 10px;
  `;
  
  // Add buttons to document
  document.body.appendChild(stopButton);
  document.body.appendChild(pauseButton);
  document.body.appendChild(timerButton);
}

// Function to simulate the auto apply process
async function simulateAutoApplyProcess() {
  // Simulate some work
  await addShortDelay();
  
  // After simulation, reset the button
  resetMainButton();
  removeControlButtons();
  stopTimer();
  runningScript = false;
}

// Function to stop the auto-apply process
function stopAutoApplyProcess() {
  runningScript = false;
  isPaused = false;
  
  // Reset main button
  resetMainButton();
  
  // Remove control buttons
  removeControlButtons();
  
  // Stop timer
  stopTimer();
}

// Function to pause the auto-apply process
function pauseAutoApplyProcess() {
  isPaused = !isPaused;
  
  if (isPaused) {
    // Change pause button to play button
    if (pauseButton) {
      pauseButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
          <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
        </svg>
      `;
    }
  } else {
    // Change play button back to pause button
    if (pauseButton) {
      pauseButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
          <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
        </svg>
      `;
    }
  }
}

// Function to reset the main button to play state
function resetMainButton() {
  if (!mainButton) return;
  
  mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
    </svg>
  `;
  
  mainButton.style.backgroundColor = '#4CAF50';
  mainButton.style.animation = 'none';
}

// Function to remove control buttons
function removeControlButtons() {
  if (stopButton && stopButton.parentNode) {
    stopButton.parentNode.removeChild(stopButton);
  }
  if (pauseButton && pauseButton.parentNode) {
    pauseButton.parentNode.removeChild(pauseButton);
  }
  if (timerButton && timerButton.parentNode) {
    timerButton.parentNode.removeChild(timerButton);
  }
  
  // Clear references
  stopButton = null;
  pauseButton = null;
  timerButton = null;
}

// Function to start the timer
function startTimer(duration: number) {
  let timer = Math.floor(duration / 1000); // Convert duration to seconds
  
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }
  
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = window.setInterval(() => {
    if (!isPaused) {
      timer--;
      
      // Update timer display
      const timerText = document.getElementById('timer-text');
      if (timerText) {
        timerText.textContent = formatTime(timer);
      }
    }
    
    if (timer <= 0) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Reset after timer ends
      resetMainButton();
      removeControlButtons();
      runningScript = false;
    }
  }, 1000);
}

// Function to stop the timer
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Function to create alert when not on job search page
function createNotOnJobSearchAlert() {
  const overlay = document.createElement('div');
  overlay.id = 'customAlertOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  
  const modal = document.createElement('div');
  modal.id = 'customAlertModal';
  modal.style.cssText = `
    background-color: #fff;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  `;
  
  const title = document.createElement('h3');
  title.innerHTML = `<b>Please navigate to jobs search page</b>`;
  title.style.marginBottom = '10px';
  
  const message = document.createElement('p');
  const jobSearchButtonContainer = document.createElement('div');
  jobSearchButtonContainer.style.marginTop = '15px';
  
  const jobSearchButton = document.createElement('button');
  jobSearchButton.innerHTML = `
    <i class="fas fa-search"></i> <b>Go To Job Search</b>
  `;
  jobSearchButton.style.cssText = `
    background-color: #2196F3;
    color: white;
    padding: 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  jobSearchButton.onclick = () => window.location.href = 'https://www.linkedin.com/jobs/search?f_AL=true';
  
  jobSearchButtonContainer.appendChild(jobSearchButton);
  message.appendChild(jobSearchButtonContainer);
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.marginTop = '15px';
  
  const okButtonContainer = document.createElement('div');
  const okButton = document.createElement('button');
  okButton.textContent = 'OK';
  okButton.style.cssText = `
    margin-right: 5px;
    padding: 10px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  okButton.onclick = closeCustomAlert;
  
  okButtonContainer.appendChild(okButton);
  buttonsContainer.appendChild(okButtonContainer);
  
  const helpButtonContainer = document.createElement('div');
  const helpButton = document.createElement('button');
  helpButton.textContent = 'Help';
  helpButton.style.cssText = `
    margin-left: 10px;
    padding: 10px;
    background-color: #FFA500;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;
  helpButton.onclick = () => window.open('https://qerds.com/tools/auto-jobs-linkedin/pages/plugin', '_blank');
  
  helpButtonContainer.appendChild(helpButton);
  buttonsContainer.appendChild(helpButtonContainer);
  
  modal.appendChild(title);
  modal.appendChild(message);
  modal.appendChild(buttonsContainer);
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// Function to close the custom alert
function closeCustomAlert() {
  const overlay = document.getElementById('customAlertOverlay');
  if (overlay) {
    overlay.remove();
  }
}

// Function to get job details from the LinkedIn job page
async function fetchJobDetails(): Promise<any> {
  try {
    // Wait a bit for page to load
    await addVeryShortDelay();
    
    const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
    const company = companyElement ? companyElement.textContent?.trim() : '';
    
    // Logic for ignoring companies
    const ignoreCompaniesResult = await new Promise<{ ignoreCompanies?: string }>((resolve) => {
      chrome.storage.local.get(['ignoreCompanies'], resolve);
    });
    
    const ignoreCompanies = ignoreCompaniesResult.ignoreCompanies 
      ? ignoreCompaniesResult.ignoreCompanies.split(',').map(co => co.trim().toLowerCase()) 
      : [];
    
    if (company && ignoreCompanies.some(ignoreCompany => company.toLowerCase().includes(ignoreCompany))) {
      console.log('Ignoring job for company:', company);
      return false;
    }
    
    // Extract other job details
    const jobTitleElement = document.querySelector('.t-24.job-details-jobs-unified-top-card__job-title h1 a');
    const jobTitle = jobTitleElement ? jobTitleElement.textContent?.trim() : '';
    
    const locationElement = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .t-black--light span:first-child span:first-child') 
      || document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .t-black--light span:first-child');
    const location = locationElement ? locationElement.textContent?.trim() : '';
    
    const descriptionElement = document.querySelector('#job-details');
    const description = descriptionElement ? descriptionElement.textContent?.trim() : '';
    
    return { jobTitle, company, location, description };
  } catch (error) {
    console.error('Error fetching job details:', error);
    return false;
  }
}

// Function to check if job matches resume
async function checkJobMatch(jobDetails: any): Promise<number | false> {
  console.log('Starting job match check...');
  
  // Get access token
  const accessTokenResult = await new Promise<{ accessToken?: string }>((resolve) => {
    chrome.storage.local.get(['accessToken'], resolve);
  });
  
  const accessToken = accessTokenResult.accessToken;
  if (!accessToken) {
    console.warn('Access token not found, skipping job match check.');
    return false;
  }
  
  try {
    // Get API token
    const apiTokenResult = await new Promise<{ apiToken?: string }>((resolve) => {
      chrome.storage.local.get([API_TOKEN_KEY], resolve);
    });
    
    const apiToken = apiTokenResult.apiToken;
    if (!apiToken) {
      console.warn('API token not found, skipping job match check.');
      return false;
    }
    
    // Get resume data
    const resumeResult = await new Promise<{ plainTextResume?: string }>((resolve) => {
      chrome.storage.local.get(['plainTextResume'], resolve);
    });
    
    const resume = resumeResult.plainTextResume;
    if (!resume) {
      console.warn('Resume not found, skipping job match check.');
      return false;
    }
    
    // Call the API to check job match
    const response = await fetch('https://qerds.com/api/v1/job-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-API-Key': apiToken
      },
      body: JSON.stringify({
        job_title: jobDetails.jobTitle,
        company: jobDetails.company,
        location: jobDetails.location,
        description: jobDetails.description,
        resume: resume
      })
    });
    
    if (!response.ok) {
      console.error('Job match API request failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('Job match result:', data);
    
    // Get minimum match score
    const minMatchScoreResult = await new Promise<{ minMatchScore?: string }>((resolve) => {
      chrome.storage.local.get(['minMatchScore'], resolve);
    });
    
    const minMatchScore = parseInt(minMatchScoreResult.minMatchScore || '3', 10);
    
    if (data.match_score >= minMatchScore) {
      return data.match_score;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking job match:', error);
    return false;
  }
}

// Initialize the extension when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtensionUI);
} else {
  initExtensionUI();
}