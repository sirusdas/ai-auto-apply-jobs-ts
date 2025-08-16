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

// Function to initialize tab event listeners
function initTabs() {
  // Use event delegation - attach listener to the parent element
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) {
    console.error('Sidebar element not found');
    return;
  }
  
  console.log('Initializing tab event listeners');
  
  sidebar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    console.log('Click event detected on:', target);
    // Check if the clicked element is a button with data-tab attribute
    if (target.tagName === 'BUTTON' && target.hasAttribute('data-tab')) {
      e.preventDefault();
      
      const tab = target.getAttribute('data-tab');
      console.log('Tab clicked:', tab);
      if (tab) {
        // Update active tab
        document.querySelectorAll('.sidebar button').forEach(button => {
          button.classList.remove('active');
        });
        target.classList.add('active');
        
        // Render the appropriate component
        renderComponent(tab);
      }
    }
  });
}

// Function to handle hash navigation
function handleHashNavigation() {
  const hash = window.location.hash;
  if (hash) {
    const tabName = hash.substring(1); // Remove the #
    const tabElement = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabElement) {
      // Update active tab
      document.querySelectorAll('.sidebar button').forEach(button => {
        button.classList.remove('active');
      });
      tabElement.classList.add('active');
      
      // Render the appropriate component
      renderComponent(tabName);
    }
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
      } else {
        darkToggle.checked = false;
      }
      
      // Apply dark mode to the page
      if (darkToggle.checked) {
        document.body.classList.add('dark-mode');
      }
    }
  });
  
  // Add event listeners for toggles (with a slight delay to ensure DOM is ready)
  setTimeout(() => {
    const developerToggle = document.getElementById('developerModeToggle') as HTMLInputElement;
    
    if (developerToggle) {
      developerToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isEnabled = target.checked;
        
        chrome.storage.local.set({ developerMode: isEnabled });
        updateDeveloperModeVisibility(isEnabled);
      });
    }
    
    const darkToggle = document.getElementById('darkModeToggle') as HTMLInputElement;
    
    if (darkToggle) {
      darkToggle.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const isEnabled = target.checked;
        
        chrome.storage.local.set({ darkMode: isEnabled });
        
        // Apply dark mode to the page
        if (isEnabled) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      });
    }
    
    // Add event listener for demo button
    const demoButton = document.getElementById('demoButton');
    if (demoButton) {
      demoButton.addEventListener('click', () => {
        // Fill form fields with demo data
        chrome.storage.local.set({
          apiToken: 'demo_api_token_12345',
          accessToken: 'demo_access_token_67890',
          FirstName: 'John',
          LastName: 'Doe',
          PhoneNumber: '+1234567890',
          City: 'San Francisco',
          Email: 'john.doe@example.com',
          YearsOfExperience: '5',
          plainTextResume: 'John Doe\nSoftware Engineer with 5 years of experience...',
          ignoreCompanies: 'Company A, Company B, Company C',
          applyToProductCompanies: true,
          applyToServiceCompanies: true,
          veryShortDelay: '1000',
          shortDelay: '5000',
          longDelay: '7000',
          minMatchScore: '3'
        }, () => {
          // Show success message
          const toast = document.getElementById('toast-message');
          if (toast) {
            toast.textContent = 'Demo data loaded successfully!';
            toast.style.display = 'block';
            setTimeout(() => {
              toast.style.display = 'none';
            }, 3000);
          }
          
          // Reload the current component to show the new data
          window.location.reload();
        });
      });
    }
  }, 100);
}

// Function to update current mode display
function updateCurrentModeDisplay(developerMode: boolean) {
  const modeDisplay = document.getElementById('current-mode-display');
  if (modeDisplay) {
    modeDisplay.textContent = developerMode ? 'Developer Mode: ON' : 'Developer Mode: OFF';
  }
}

// Function to create and show the demo modal
function createAndShowModal() {
  if (document.getElementById('demoModal')) return;

  const modal = document.createElement('div');
  modal.id = 'demoModal';
  modal.className = 'demo-modal';
  modal.innerHTML = `
    <div class="demo-modal-content">
      <h2 style="color: #8a9da7;">🚀 Welcome to the Demo!</h2>
      <p>This interactive demo will guide you through the essential settings. All highlighted fields are mandatory.</p>
      <p>Click "Start Demo" to begin.</p>
      <div class="demo-modal-buttons">
        <button id="startDemo" class="demo-btn demo-btn-start">Start Demo</button>
        <button id="cancelDemo" class="demo-btn demo-btn-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#startDemo')?.addEventListener('click', () => startDemo());
  modal.querySelector('#cancelDemo')?.addEventListener('click', () => hideModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  showModal();
}

// Function to show the modal
function showModal() {
  const modal = document.getElementById('demoModal');
  if (!modal) return;
  setTimeout(() => modal.classList.add('show'), 10);
}

// Function to hide the modal
function hideModal() {
  const modal = document.getElementById('demoModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }, 300);
}

// Function to start the demo
function startDemo() {
  hideModal();
  
  // Fill form fields with demo data
  chrome.storage.local.set({
    apiToken: 'demo_api_token_12345',
    accessToken: 'demo_access_token_67890',
    FirstName: 'John',
    LastName: 'Doe',
    PhoneNumber: '+1234567890',
    City: 'San Francisco',
    Email: 'john.doe@example.com',
    YearsOfExperience: '5',
    plainTextResume: 'John Doe\nSoftware Engineer with 5 years of experience...',
    ignoreCompanies: 'Company A, Company B, Company C',
    applyToProductCompanies: true,
    applyToServiceCompanies: true,
    veryShortDelay: '1000',
    shortDelay: '5000',
    longDelay: '7000',
    minMatchScore: '3'
  }, () => {
    // Show success message
    const toast = document.getElementById('toast-message');
    if (toast) {
      toast.textContent = 'Demo data loaded successfully!';
      toast.style.display = 'block';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    }
    
    // Reload the current component to show the new data
    window.location.reload();
  });
}

// Initialize the settings page
function initSettingsPage() {
  console.log('Initializing settings page');
  
  // Set up tab event listeners
  initTabs();
  
  // Initialize mode toggles
  initModeToggles();
  
  // Initialize accordion functionality
  initAccordions();
  
  // Render the default component (settings)
  renderComponent('settings');
  
  // Check for hash in URL to determine which tab to show
  handleHashNavigation();
}

// Function to initialize accordion functionality
function initAccordions() {
  console.log('Initializing accordion functionality');
  
  // Delegated event listener for all accordions
  document.body.addEventListener('click', function(event) {
    const target = event.target as HTMLElement;
    const accordion = target.closest('.accordion');
    
    // If the click is not on an accordion, do nothing
    if (!accordion) {
      return;
    }
    
    // Toggle active class on accordion
    accordion.classList.toggle('active');
    
    // Toggle display of panel
    const panel = accordion.nextElementSibling as HTMLElement;
    if (panel && panel.classList.contains('panel')) {
      panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
    }
  });
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  console.log('DOM is still loading, waiting for DOMContentLoaded event');
  document.addEventListener('DOMContentLoaded', initSettingsPage);
} else {
  // DOM is already loaded
  console.log('DOM is already loaded, initializing settings page');
  initSettingsPage();
}

// Listen for hash changes
window.addEventListener('hashchange', handleHashNavigation);

// Also handle hash navigation on page load
window.addEventListener('load', () => {
  handleHashNavigation();
});