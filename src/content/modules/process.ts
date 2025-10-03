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
    addShortDelay
} from './core';

// UI components
import { 
    createControlButtons, 
    removeControlButtons,
    resetMainButton, 
    showLoadingState, 
    startTimer, 
    stopTimer
} from './ui';

// Job processing functions
import { 
    checkDailyLimit,
    clickJob,
    getDailyJobCount,
    goToNextPage,
    handleScriptTermination,
    scrollAndFetchJobDetails,
    updateDailyJobCount,
    fetchJobDetails,
    checkJobMatch
} from './jobProcessor';

import { runFindEasyApply } from './application';

// Function to scroll a little in the job panel
async function jobPanelScrollLittle() {
    const jobsPanel = document.querySelector('.jobs-search-results-list');
    if (jobsPanel) {
        jobsPanel.scrollBy(0, 100);
        await addShortDelay();
    }
}

// Function to start the auto-apply process
export async function runAutoApplyProcess(resume: string) {
    try {
        console.log('Starting auto-apply process...');
        setRunningScript(true);

        // Check daily limit
        let dailyJobCount = await getDailyJobCount();
        console.log('Current daily job count:', dailyJobCount);
        const underLimit = dailyJobCount < dailyLimit;
        if (!underLimit) {
            console.log('Daily limit reached');
            return;
        }

        // Scroll and fetch job details
        const jobElementsArray = Array.from(document.querySelectorAll('.scaffold-layout__list-item:not(.jobs-search-results__job-card-search--generic-occludable-area)'));
        let { currentIndex, jobDetails, company_names } = await scrollAndFetchJobDetails(jobElementsArray);

        // Process jobs
        let processedCount = 0;
        const jobElements = document.querySelectorAll('.scaffold-layout__list-item:not(.jobs-search-results__job-card-search--generic-occludable-area)');
        
        for (let i = currentIndex; i < jobElements.length && isScriptRunning(); i++) {
            const listItem = jobElements[i] as HTMLElement;
            
            // Check if already applied
            // Note: This function needs to be imported or defined
            // if (isJobApplied(listItem)) {
            //     console.log('Job already applied, skipping...');
            //     continue;
            // }

            // Click on job
            listItem.click();
            await addShortDelay();

            // Fetch job details
            const jobDetails = await fetchJobDetails();
            if (!jobDetails) {
                console.log('Failed to fetch job details');
                await jobPanelScrollLittle();
                continue;
            }

            // Check job match using AI
            const matchScore = await checkJobMatch(jobDetails, resume);
            const minMatchScore = 3; // Default value
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
            
            // Add delay
            await addDelay();
            
            // Scroll to next job
            await jobPanelScrollLittle();
        }

        console.log(`Processed ${processedCount} jobs`);
        
        // Move to next page if needed
        if (isScriptRunning()) {
            await goToNextPage();
        }
    } catch (error) {
        console.error('Error in auto-apply process:', error);
    } finally {
        // Clean up
        setRunningScript(false);
        resetMainButton();
        stopTimer();
    }
}

// Function to start the auto-apply process
export async function startAutoApplyProcess(resume: string) {
    // Start the timer with a default duration of 60 minutes (3600 seconds)
    startTimer(3600);
    
    // Run the auto-apply process
    await runAutoApplyProcess(resume);
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
    await handleScriptTermination();
}