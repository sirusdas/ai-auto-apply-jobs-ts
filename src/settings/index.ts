import React from 'react';
import { createRoot } from 'react-dom/client';
import TokenSettings from '../popup/components/TokenSettings';
import PersonalInfoSettings from '../popup/components/PersonalInfoSettings';
import ResumeManagement from '../popup/components/ResumeManagement';
import JobMatchSettings from '../popup/components/JobMatchSettings';
import CompanyPreferences from '../popup/components/CompanyPreferences';
import DelaySettings from '../popup/components/DelaySettings';
import AppliedJobs from '../popup/components/AppliedJobs';
import AccessTokenSettings from './components/AccessTokenSettings';
import FormControlConfigurations from './components/FormControlConfigurations';
import SearchTimerConfig from './components/SearchTimerConfig';
import '../assets/styles/popup.css';
import '../assets/styles/settings.css';

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
      console.log('Rendering AccessTokenSettings component');
      componentElement = React.createElement(AccessTokenSettings, {});
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

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initModeToggles();
  
  // Render the default component
  renderComponent('settings');
  
  console.log('Settings page initialized');
});

// Export the renderComponent function so it can be called from the HTML
(window as any).renderComponent = renderComponent;