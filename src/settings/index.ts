import React from 'react';
import { createRoot } from 'react-dom/client';
import TokenSettings from './components/TokenSettings';
import PersonalInfoSettings from '../popup/components/PersonalInfoSettings';
import ResumeManagement from '../popup/components/ResumeManagement';
import JobMatchSettings from '../popup/components/JobMatchSettings';
import CompanyPreferences from '../popup/components/CompanyPreferences';
import DelaySettings from '../popup/components/DelaySettings';
import AppliedJobs from '../popup/components/AppliedJobs';
import FormControlConfigurations from './components/FormControlConfigurations';
import SearchTimerConfig from './components/SearchTimerConfig';
import AIProviderSettings from './components/AIProviderSettings';
import '../assets/styles/popup.css';
import '../assets/styles/settings.css';
import * as tokenService from '../utils/tokenService';

// Variable to hold the current React root
let currentRoot: any = null;

// Function to render the appropriate component based on the active tab
function renderComponent(componentName: string) {
  const container = document.getElementById('settings-container');
  console.log('Rendering component:', componentName);
  console.log('Container element:', container);

  if (!container) {
    console.error('Settings container not found');
    return;
  }

  // Unmount the previous root if it exists BEFORE clearing the container
  if (currentRoot) {
    console.log('Unmounting previous root');
    currentRoot.unmount();
  }

  // Clear the container AFTER unmounting the React component
  container.innerHTML = '';

  // Create a new root and render the component
  currentRoot = createRoot(container);
  console.log('Created new root:', currentRoot);

  let componentElement: React.ReactElement | null = null;

  switch (componentName) {
    case 'settings':
      console.log('Rendering TokenSettings component');
      componentElement = React.createElement(TokenSettings, {});
      break;

    case 'gemini':
      console.log('Rendering AIProviderSettings component');
      componentElement = React.createElement(AIProviderSettings, {});
      break;

    case 'ai-providers':
      console.log('Rendering AIProviderSettings component');
      componentElement = React.createElement(AIProviderSettings, {});
      break;

    case 'personal-info':
      console.log('Rendering PersonalInfoSettings component');
      componentElement = React.createElement(PersonalInfoSettings, {});
      break;

    case 'resume':
      console.log('Rendering ResumeManagement component');
      componentElement = React.createElement(ResumeManagement, {});
      break;

    case 'job-match':
      console.log('Rendering JobMatchSettings component');
      componentElement = React.createElement(JobMatchSettings, {});
      break;

    case 'company-preferences':
      console.log('Rendering CompanyPreferences component');
      componentElement = React.createElement(CompanyPreferences, {});
      break;

    case 'delay':
      console.log('Rendering DelaySettings component');
      componentElement = React.createElement(DelaySettings, {});
      break;

    case 'applied-jobs':
      console.log('Rendering AppliedJobs component');
      componentElement = React.createElement(AppliedJobs, {});
      break;

    case 'form-control':
      console.log('Rendering FormControlConfigurations component');
      componentElement = React.createElement(FormControlConfigurations, {});
      break;

    case 'search-timer':
      console.log('Rendering SearchTimerConfig component');
      componentElement = React.createElement(SearchTimerConfig, {});
      break;

    default:
      console.log('Rendering default TokenSettings component');
      componentElement = React.createElement(TokenSettings, {});
  }

  // Render the component
  if (componentElement) {
    currentRoot.render(componentElement);
    console.log('Component rendered successfully');
  } else {
    console.error('Failed to create component element');
  }
}

// Function to initialize mode toggles
function initModeToggles() {
  // Helper function to update developer mode visibility
  function updateDeveloperModeVisibility(isEnabled: boolean) {
    if (isEnabled) {
      document.body.classList.add('developer-mode-on');
    } else {
      document.body.classList.remove('developer-mode-on');
    }

    // Update the mode display text
    const modeDisplay = document.getElementById('current-mode-display');
    if (modeDisplay) {
      modeDisplay.textContent = isEnabled ? 'Developer Mode: ON' : 'Developer Mode: OFF';
    }
  }

  // Load saved settings
  chrome.storage.local.get(['developerMode', 'darkMode'], (result) => {
    // Handle developer mode
    const developerToggle = document.getElementById('developerModeToggle') as HTMLInputElement;

    if (developerToggle) {
      if (result.developerMode !== undefined) {
        developerToggle.checked = result.developerMode;
        updateDeveloperModeVisibility(result.developerMode);
      } else {
        // Default to developer mode enabled for testing
        developerToggle.checked = true;
        updateDeveloperModeVisibility(true);
        // Save the default setting
        chrome.storage.local.set({ developerMode: true });
      }
    }

    // Handle dark mode
    const darkToggle = document.getElementById('darkModeToggle') as HTMLInputElement;

    if (darkToggle) {
      if (result.darkMode !== undefined) {
        darkToggle.checked = result.darkMode;
        if (result.darkMode) {
          document.body.classList.add('dark-mode');
        }
      }

      // Add event listener for dark mode toggle
      darkToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isChecked = target.checked;
        if (isChecked) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
        chrome.storage.local.set({ darkMode: isChecked });
      });
    }
  });

  // Add event listener for developer mode toggle
  const developerToggle = document.getElementById('developerModeToggle') as HTMLInputElement;
  if (developerToggle) {
    developerToggle.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const isChecked = target.checked;
      updateDeveloperModeVisibility(isChecked);
      chrome.storage.local.set({ developerMode: isChecked });
    });
  }
}

// Function to update the API status badge
async function updateApiStatusBadge() {
  const badge = document.getElementById('api-status-badge');
  if (!badge) return;

  const tokenData = await tokenService.getTokenData();

  badge.className = 'status-badge'; // Reset classes

  if (!tokenData || !tokenData.valid) {
    badge.classList.add('invalid');
    badge.title = 'API Token Missing or Invalid';
    return;
  }

  // Check for expiry
  const expiryDate = new Date(tokenData.expires_at);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    badge.classList.add('invalid');
    badge.title = 'API Token Expired';
  } else if (diffDays <= 7) {
    badge.classList.add('warning');
    badge.title = `API Token Expiring Soon (${diffDays} days left)`;
  } else {
    badge.classList.add('valid');
    badge.title = 'API Token Valid';
  }
}

// Check token validity when settings page loads
async function checkTokenOnLoad() {
  const token = await tokenService.getToken();
  if (token) {
    // There's a token, let's validate it
    try {
      const result = await tokenService.validateToken();
      if (result.valid) {
        // Update token data in storage
        chrome.storage.local.set({ [tokenService.TOKEN_DATA_KEY]: result.data });
      } else {
        // Token is invalid, update status
        const existingData = await tokenService.getTokenData();
        const updatedData = {
          ...existingData,
          valid: false,
          last_error: {
            message: result.error || 'Token validation failed',
            timestamp: new Date().toISOString()
          }
        };
        chrome.storage.local.set({ [tokenService.TOKEN_DATA_KEY]: updatedData });
      }
      // Update the badge and UI to reflect current status
      updateApiStatusBadge();
      // Re-render the token settings component to show current status
      renderComponent('settings');
    } catch (error) {
      console.error('Error validating token on load:', error);
    }
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initModeToggles();
  updateApiStatusBadge();
  checkTokenOnLoad(); // Check token validity when page loads

  // Render the default component
  renderComponent('settings');

  console.log('Settings page initialized');
});

// Listen for storage changes to update the badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes[tokenService.TOKEN_DATA_KEY] || changes[tokenService.API_TOKEN_KEY])) {
    updateApiStatusBadge();
  }
});

// Export the renderComponent function so it can be called from the HTML
(window as any).renderComponent = renderComponent;