// Main process functionality for the auto-apply extension

// Core state management and selectors
import { 
    setRunningScript, 
    setIsPaused, 
    setTimeoutReached,
    setScriptStopped,
    isScriptRunning,
    dailyLimit,
    timeoutReached,
    addDelay,
    addShortDelay,
    DAILY_LIMIT
} from './core';

// UI components
import { 
    createControlButtons, 
    removeControlButtons,
    resetMainButton, 
    showLoadingState, 
    startTimer, 
    stopTimer,
    validateTokenWithCache
} from './ui';

// Job processing functions
import { 
    clickJob,
    getDailyJobCount,
    goToNextPage,
    handleScriptTermination,
    updateDailyJobCount,
    fetchJobDetails,
    checkJobMatch,
    isJobApplied
} from './jobProcessor';

// Application functions
import { runFindEasyApply } from './application';

// Utility imports
import { isScriptRunning as coreIsScriptRunning } from './core';
import { addDelay as utilAddDelay, addShortDelay as utilAddShortDelay, goToNextPage as utilGoToNextPage } from './utils/navigation';
import { getDailyJobCount as utilGetDailyJobCount, updateDailyJobCount as utilUpdateDailyJobCount, checkDailyLimit as utilCheckDailyLimit } from './utils/storage';

// Function to scroll a little in the job panel
async function jobPanelScrollLittle() {
    const listItem = document.querySelector('.scaffold-layout__list-item');
    const jobsPanel = listItem?.closest<HTMLUListElement>('ul');
    const jobsPanelDiv = listItem?.closest<HTMLDivElement>('div');

    if (jobsPanel) {
        jobsPanel.scrollTop += jobsPanel.scrollHeight * 0.05;
        await addShortDelay();
    }
    if (jobsPanelDiv) {
        jobsPanelDiv.scrollTop += jobsPanelDiv.scrollHeight * 0.03;
        await addShortDelay();
    }
}

// Function to scroll and fetch job details
async function scrollAndFetchJobDetails(jobList: Element[]) {
    console.log('Scrolling and fetching jobs...');
    
    // Scroll to each job to fetch details
    for (const job of jobList) {
        job.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await addDelay();
    }
    
    // Return mock data for now - will be implemented properly
    return {
        currentIndex: 0, 
        jobDetails: [], 
        company_names: []
    };
}

export async function runAutoApplyProcess(resume: any) {
    console.log('Starting auto-apply process...');
    
    let processedCount = 0;
    let currentIndex = 0;
    
    // Check if we've reached the daily limit
    const isLimitReached = await utilCheckDailyLimit(false, DAILY_LIMIT);
    if (isLimitReached) {
        console.log('Daily limit already reached, stopping process');
        showLimitReachedPopup();
        return;
    }

    // Get job elements with multiple possible selectors
    let jobElements: Element[] = [];
    
    // Try multiple selectors for job elements
    const selectors = [
        '.jobs-search-results__list-item .job-card-container',
        '.job-card-list__item .job-card-container',
        '.jobs-search-results-list li',
        '.jobs-search-results__list li',
        '[data-job-id]',
        '.job-card-container',
        '.jobs-search-results__list-item',
        '.job-card-list__item'
    ];
    
    for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        console.log(`Selector '${selector}' found ${elements.length} elements`);
        if (elements.length > 0) {
            jobElements = elements;
            break;
        }
    }
    
    console.log(`Found ${jobElements.length} job elements`);

    if (jobElements.length === 0) {
        console.log('No job elements found');
        // Try to log what elements we do find on the page
        const jobListSelectors = [
            '.jobs-search-results-list',
            '.jobs-search-results__list',
            '.jobs-search-content',
            '.jobs-search__results-list',
            '[data-job-search-results]',
            '.scaffold-layout__list-container'
        ];
        
        let jobListContainerFound = false;
        for (const selector of jobListSelectors) {
            const container = document.querySelector(selector);
            if (container) {
                console.log(`Job list container found with selector '${selector}'`);
                console.log('Container class:', container.className);
                console.log('Container tag:', container.tagName);
                console.log('Children count:', container.children.length);
                
                // Log first few children for debugging
                const children = Array.from(container.children);
                children.slice(0, 10).forEach((child, index) => {
                    console.log(`Child ${index}:`, child.className, child.tagName, child.id);
                    // Log first level nested elements
                    const grandchildren = Array.from(child.children);
                    if (grandchildren.length > 0) {
                        console.log(`  Grandchildren count: ${grandchildren.length}`);
                        grandchildren.slice(0, 3).forEach((gc, gcIndex) => {
                            console.log(`    GC ${gcIndex}:`, gc.className, gc.tagName, gc.id);
                        });
                    }
                });
                
                jobListContainerFound = true;
                break;
            }
        }
        
        if (!jobListContainerFound) {
            console.log('Job list container not found');
            // Log available containers for debugging
            const containers = document.querySelectorAll('ul, div');
            console.log('Available containers:', containers.length);
            
            // Try to find containers that might contain jobs
            const potentialContainers = Array.from(containers).filter(container => {
                return container.children.length > 0 && 
                       (container.className.includes('job') || 
                        container.className.includes('list') ||
                        container.className.includes('result'));
            });
            
            console.log('Potential job containers:', potentialContainers.length);
            potentialContainers.slice(0, 5).forEach((container, index) => {
                console.log(`Potential container ${index}:`, container.className, container.tagName);
                const children = Array.from(container.children);
                console.log(`  Children: ${children.length}`);
                children.slice(0, 3).forEach((child, childIndex) => {
                    console.log(`    Child ${childIndex}:`, child.className, child.tagName);
                });
            });
        }
        return;
    }

    // Main processing loop
    for (let i = currentIndex; i < jobElements.length; i++) {
        // Check if we should continue running
        if (!isScriptRunning()) {
            console.log('Script stopped by user');
            break;
        }
        
        // Check daily limit during processing
        const isLimitReached = await utilCheckDailyLimit(false, DAILY_LIMIT);
        if (isLimitReached) {
            console.log('Daily limit reached during processing');
            showLimitReachedPopup();
            break;
        }

        const listItem = jobElements[i] as HTMLElement;
        
        // Check if already applied
        if (isJobApplied(listItem)) {
            console.log('Job already applied, skipping...');
            await jobPanelScrollLittle();
            continue;
        }

        // Click on job
        listItem.click();
        await utilAddShortDelay();

        // Fetch job details
        const jobDetails = await fetchJobDetails();
        if (!jobDetails) {
            console.log('Failed to fetch job details');
            await jobPanelScrollLittle();
            continue;
        }

        // Check job match using AI
        const matchScore = await checkJobMatch(jobDetails, resume);
        const minMatchScore = await new Promise<number>((resolve) => {
            chrome.storage.local.get('minMatchScore', (result) => {
                resolve(result.minMatchScore ? parseInt(result.minMatchScore) : 3);
            });
        });
        if (!matchScore || matchScore < minMatchScore) {
            console.log('Job does not match criteria, skipping...');
            await jobPanelScrollLittle();
            continue;
        }

        console.log(`Job match score: ${matchScore}`);

        // Run Easy Apply
        await runFindEasyApply();

        // Update counters
        processedCount++;
        await utilUpdateDailyJobCount(processedCount);
        
        // Add delay
        await utilAddDelay();
        
        // Scroll to next job
        await jobPanelScrollLittle();
    }

    console.log(`Processed ${processedCount} jobs`);
    
    // Move to next page if needed
    if (isScriptRunning()) {
        await utilGoToNextPage();
    }
}

// Function to start the auto-apply process
export async function startAutoApplyProcess(resume: any) {
    console.log('Starting auto-apply process...');
    
    // Create control buttons for pause/stop functionality
    createControlButtons();
    
    // Show loading state on main button
    showLoadingState();
    
    // Start timer
    startTimer(0);
    
    // Set the script as running
    setRunningScript(true);
    
    // Check if token is valid
    console.log('Checking token validation...');
    const tokenValidation = await validateTokenWithCache();
    console.log('Token validation result:', tokenValidation);
    
    if (!tokenValidation) {
        console.log('Token validation returned null or undefined');
        setRunningScript(false);
        removeControlButtons();
        resetMainButton();
        showTokenPopup();
        return;
    }
    
    if (!tokenValidation.valid) {
        console.log('Token validation failed:', (tokenValidation as any).error || 'Unknown error');
        setRunningScript(false);
        removeControlButtons();
        resetMainButton();
        showTokenPopup();
        return;
    }
    
    console.log('Token validation passed, starting auto-apply process');
    // Start the auto-apply process
    try {
        await runAutoApplyProcess(resume);
    } catch (error) {
        console.error('Error during auto-apply process:', error);
    } finally {
        // Set the script as not running when done
        setRunningScript(false);
        removeControlButtons();
        resetMainButton();
        stopTimer();
    }
}

// Function to stop the auto-apply process
export async function stopAutoApplyProcess() {
    console.log('Stopping auto-apply process...');
    setRunningScript(false);
    setIsPaused(false);
    setTimeoutReached(false);
    setScriptStopped(true);
    resetMainButton();
    stopTimer();
    // Add a small delay to ensure all state changes are processed
    await addShortDelay();
    await handleScriptTermination();
}


function showTokenPopup(): void {
    const popup = document.createElement('div');
    popup.id = 'token-popup';
    Object.assign(popup.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '20px',
        zIndex: '10000',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        width: '300px'
    });

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
    });
    closeBtn.addEventListener('click', () => popup.remove());

    const message = document.createElement('p');
    message.textContent = 'Oops, You will need a fresh token to Auto Apply';
    Object.assign(message.style, {
        marginBottom: '20px',
        fontSize: '16px',
        color: '#333',
        fontWeight: 'bold'
    });

    const button = document.createElement('button');
    button.textContent = 'Generate Token';
    Object.assign(button.style, {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    });
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#0056b3';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#007bff';
    });
    button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openPage', url: 'settings.html' });
        popup.remove();
    });

    popup.append(closeBtn, message, button);
    document.body.appendChild(popup);
}

function showLimitReachedPopup(): void {
    // Create and show a popup informing the user that the daily limit has been reached
    const popup = document.createElement('div');
    popup.id = 'daily-limit-popup';
    Object.assign(popup.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '20px',
        zIndex: '10000',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        width: '300px'
    });

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '10px',
        right: '10px',
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
    });
    closeBtn.addEventListener('click', () => popup.remove());

    const message = document.createElement('p');
    message.textContent = 'Daily limit has been reached. Click here to apply more.';
    Object.assign(message.style, {
        marginBottom: '20px',
        fontSize: '16px',
        color: '#333',
        fontWeight: 'bold'
    });

    const button = document.createElement('button');
    button.textContent = 'Upgrade Plan';
    Object.assign(button.style, {
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    });
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#0056b3';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#007bff';
    });
    button.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openPage', url: 'settings.html' });
        popup.remove();
    });

    popup.append(closeBtn, message, button);
    document.body.appendChild(popup);
}
