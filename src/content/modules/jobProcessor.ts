// Job processing functionality for the auto-apply extension

import { isScriptRunning, timeoutReached, DAILY_LIMIT } from './core';
import { addDelay, addShortDelay, goToNextPage, handleScriptTermination } from './utils/navigation';
import { runValidations } from './formHandling';
import { getDailyJobCount, updateDailyJobCount, checkDailyLimit } from './utils/storage';

// Function to click on a job
async function clickJob(jobElement: Element) {
    console.log('clickJob: Starting function with job element:', jobElement);
    console.log('clickJob: Checking token validity (not implemented yet)');
    
    if (timeoutReached) {
        console.log('clickJob: Timeout reached, skipping job click');
        return;
    }

    console.log('clickJob: Checking if job is already applied');
    if (isJobApplied(jobElement)) {
        console.log('clickJob: Job already applied, skipping...');
        await jobPanelScrollLittle();
        return;
    }

    try {
        console.log('clickJob: Adding short delay before job interaction');
        await addShortDelay();
        
        console.log('clickJob: Looking for job title link using primary selector');
        const jobTitleLink = jobElement.querySelector<HTMLElement>('.artdeco-entity-lockup__title .job-card-container__link');
        
        await addShortDelay();
        
        if (!jobTitleLink) {
            console.log('clickJob: Primary job title link not found, checking alternative selectors');
            // Try alternative selectors
            const alternativeSelectors = [
                '.job-card-container__title',
                '.job-card-list__title',
                '.job-card__title'
            ];
            
            for (const selector of alternativeSelectors) {
                const altLink = jobElement.querySelector<HTMLElement>(selector);
                if (altLink) {
                    console.log(`clickJob: Found job title link using alternative selector: ${selector}`);
                    console.log(`clickJob: Clicking job title link - ${selector}`);
                    altLink.click();
                    await addDelay();
                    console.log('clickJob: Running form validations for job element');
                    await runValidations(jobElement);
                    console.log('clickJob: Completed form validations');
                    return;
                }
            }
            
            console.log('clickJob: No job title link found after trying all selectors');
            console.log('clickJob: Scrolling a little and dismissing modal if present');
            await jobPanelScrollLittle();
            document.querySelector<HTMLElement>('.artdeco-modal__dismiss')?.click();
            return;
        }

        console.log('clickJob: Found job title link, text content:', jobTitleLink.textContent?.trim());
        console.log('clickJob: Clicking job title link:', jobTitleLink.textContent?.trim());
        jobTitleLink.click();
        await addDelay();
        console.log('clickJob: Successfully clicked job title link');

        console.log('clickJob: Starting form validations for job element');
        await runValidations(jobElement);
        console.log('clickJob: Successfully completed form validations');
    } catch (e) {
        console.error('clickJob: Error during job click:', e);
        await jobPanelScrollLittle();
    }
}

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

// Function to check if job is already applied
function isJobApplied(jobElement: Element): boolean {
    // Try multiple selectors for the applied status
    const selectors = [
        '.job-card-container__footer-item.job-card-container__footer-job-state',
        '.job-card-container__footer-job-state',
        '[data-job-state="APPLIED"]',
        '.job-card-list__item--applied',
        '.job-card-container--applied'
    ];
    
    for (const selector of selectors) {
        const appliedStatusElement = jobElement.querySelector(selector);
        if (appliedStatusElement) {
            const appliedStatus = appliedStatusElement.textContent?.trim().toLowerCase();
            console.log(`Found applied status element with selector '${selector}':`, appliedStatus);
            return appliedStatus === 'applied' || appliedStatus === 'submitted' || appliedStatusElement.classList.contains('job-card-list__item--applied');
        }
    }
    
    // Check for applied indicators in the class list
    if (jobElement.classList.contains('job-card-list__item--applied') || 
        jobElement.classList.contains('job-card-container--applied')) {
        console.log('Job marked as applied via class names');
        return true;
    }
    
    // Check for "Applied" text anywhere in the job element
    const allText = jobElement.textContent?.toLowerCase();
    if (allText && (allText.includes('applied') || allText.includes('submitted'))) {
        console.log('Found "applied" text in job element');
        return true;
    }
    
    console.log('Job not marked as applied');
    return false;
}

// Function to fetch job details
async function fetchJobDetails() {
    try {
        console.log('Fetching job details...');
        
        // Get job title with multiple selectors
        let jobTitle = '';
        const jobTitleSelectors = [
            'h2.jobs-unified-top-card__job-title a',
            '.job-details-jobs-unified-top-card__job-title a',
            '.jobs-unified-top-card__job-title',
            '.job-details-jobs-unified-top-card__job-title',
            '[data-job-title]',
            '.top-card__title'
        ];
        
        for (const selector of jobTitleSelectors) {
            const jobTitleElement = document.querySelector(selector);
            if (jobTitleElement) {
                jobTitle = jobTitleElement.textContent?.trim() || '';
                console.log(`Found job title with selector '${selector}':`, jobTitle);
                break;
            }
        }

        // Get company name with multiple selectors
        let company = '';
        const companySelectors = [
            '.jobs-unified-top-card__company-name a',
            '.job-details-jobs-unified-top-card__company-name a',
            '.jobs-unified-top-card__company-name',
            '.job-details-jobs-unified-top-card__company-name',
            '[data-company-name]',
            '.top-card__org-name'
        ];
        
        for (const selector of companySelectors) {
            const companyElement = document.querySelector(selector);
            if (companyElement) {
                company = companyElement.textContent?.trim() || '';
                console.log(`Found company with selector '${selector}':`, company);
                break;
            }
        }

        // Get job location with multiple selectors
        let location = '';
        const locationSelectors = [
            '.jobs-unified-top-card__bullet',
            '.job-details-jobs-unified-top-card__bullet',
            '.jobs-unified-top-card__location',
            '.job-details-jobs-unified-top-card__location',
            '[data-location]',
            '.top-card__location',
            '.jobs-unified-top-card__primary-description', // Additional selector
            '.job-details-jobs-unified-top-card__primary-description' // Additional selector
        ];
        
        for (const selector of locationSelectors) {
            const locationElement = document.querySelector(selector);
            if (locationElement) {
                location = locationElement.textContent?.trim() || '';
                console.log(`Found location with selector '${selector}':`, location);
                break;
            }
        }

        // Get job description with multiple selectors
        let description = '';
        const descriptionSelectors = [
            '.jobs-description-content__text',
            '.job-details-jobs-description-content__text',
            '.jobs-box__html-content',
            '.job-details-module .description__text',
            '[data-job-description]',
            '.job-description'
        ];
        
        for (const selector of descriptionSelectors) {
            const descriptionElement = document.querySelector(selector);
            if (descriptionElement) {
                description = descriptionElement.textContent?.trim() || '';
                console.log(`Found description with selector '${selector}', length:`, description.length);
                break;
            }
        }

        const jobDetails = {
            title: jobTitle,
            company: company,
            location: location,
            description: description
        };
        
        console.log('Job details fetched:', jobDetails);
        return jobDetails;
    } catch (error) {
        console.error('Error fetching job details:', error);
        return null;
    }
}

// Function to check job match using AI
console.log('checkJobMatch: Starting function');
async function checkJobMatch(jobDetails: any, resume: any) {
    try {
        // Get all settings at once to avoid timing issues
        console.log('checkJobMatch: Retrieving settings from storage');
        const settings = await new Promise<any>((resolve, reject) => {
            // Also retrieve all keys to see what's actually in storage
            console.log('checkJobMatch: Getting all settings from storage');
            chrome.storage.local.get(null, (allSettings) => {
                console.log('checkJobMatch: All settings in storage:', allSettings);
                console.log('checkJobMatch: All keys in storage:', Object.keys(allSettings));
                
                // Now get the specific settings we need
                console.log('checkJobMatch: Getting specific settings');
                chrome.storage.local.get(['minMatchScore', 'useCustomAI', 'aiServerUrl', 'geminiApiKey', 'geminiModel'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('checkJobMatch: Chrome runtime error retrieving settings:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('checkJobMatch: Retrieved all settings:', result);
                        console.log('checkJobMatch: Keys in result:', Object.keys(result));
                        console.log('checkJobMatch: Full result object:', JSON.stringify(result));
                        resolve(result);
                    }
                });
            });
        }).catch(error => {
            console.error('checkJobMatch: Error retrieving settings:', error);
            return {};
        });
        
        console.log('checkJobMatch: Processing settings values');
        const minMatchScore = settings.minMatchScore ? parseInt(settings.minMatchScore) : 3;
        const useCustomAI = settings.useCustomAI || false;
        const aiServerUrl = settings.aiServerUrl || 'https://qerds.com/tools/tgs/api/analyze-job';
        const geminiApiKey = settings.geminiApiKey;
        const geminiModel = settings.geminiModel || 'gemini-2.0-flash-lite';
        
        console.log('checkJobMatch: Settings values:');
        console.log('- minMatchScore:', minMatchScore);
        console.log('- useCustomAI:', useCustomAI);
        console.log('- aiServerUrl:', aiServerUrl);
        console.log('- geminiApiKey:', geminiApiKey ? '****' + geminiApiKey.substring(geminiApiKey.length - 4) : 'undefined');
        console.log('- geminiModel:', geminiModel);
        
        if (useCustomAI) {
            // Use custom AI API (premium feature)
            console.log('Using custom AI API:', aiServerUrl);
            
            try {
                const response = await fetch(aiServerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        job: jobDetails,
                        resume: resume
                    })
                });

                // If the endpoint doesn't exist or returns an error, provide a fallback
                if (!response.ok) {
                    console.error(`Custom AI API request failed with status ${response.status}`);
                    if (response.status === 404) {
                        console.log('Custom AI API endpoint not found, using default match score');
                        // Fallback: Return a default match score to continue processing
                        return 4; // Return a medium match score to continue processing
                    }
                    throw new Error(`Custom AI API request failed with status ${response.status}`);
                }

                const result = await response.json();
                const matchScore = result.matchScore;
                
                if (result.reasoning) {
                    console.log('AI Analysis:', result.reasoning);
                }

                console.log('Job Match Score:', matchScore);
                return matchScore >= minMatchScore ? matchScore : false;
            } catch (error) {
                console.error('Custom AI API Error:', error);
                // Fallback: Return a default match score to continue processing
                console.log('Custom AI API error, using default match score');
                return 4; // Return a medium match score to continue processing
            }
        } else {
            // Use Gemini API (default for non-premium users)
            // The geminiApiKey and geminiModel are already retrieved in the settings object
            // If we reach this point, we've already retrieved all settings
            
            if (!geminiApiKey) {
                console.error('Gemini API key not found');
                // Fallback: Return a default match score to continue processing
                console.log('Gemini API key not found, using default match score');
                return 4; // Return a medium match score to continue processing
            }
            
            const prompt = `Job Details:
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Location: ${jobDetails.location}
Description: ${jobDetails.description}

Resume: ${JSON.stringify(resume)}

Based on the job details and the resume, please provide a match score from 1-5 (where 1 is poor match and 5 is excellent match) and explain your reasoning. Return your response in JSON format with "matchScore" (number) and "reasoning" (string) fields.`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: prompt
                            }]
                        }]
                    })
                });

                if (!response.ok) {
                    console.error(`Gemini API request failed with status ${response.status}`);
                    throw new Error(`Gemini API request failed with status ${response.status}`);
                }

                const data = await response.json();
                const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                try {
                    // Try to parse the response as JSON
                    // First, try to extract JSON from Markdown code blocks if present
                    let jsonString = textResponse;
                    const codeBlockMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (codeBlockMatch) {
                        jsonString = codeBlockMatch[1];
                    }
                    
                    const jsonResponse = JSON.parse(jsonString);
                    const matchScore = jsonResponse.matchScore;
                    
                    if (jsonResponse.reasoning) {
                        console.log('AI Analysis:', jsonResponse.reasoning);
                    }
                    
                    console.log('Job Match Score:', matchScore);
                    return matchScore >= minMatchScore ? matchScore : false;
                } catch (parseError) {
                    // If JSON parsing fails, try to extract a score from the text
                    console.error('Error parsing Gemini API response as JSON:', parseError);
                    console.log('Raw Gemini API response:', textResponse);
                    
                    // Try to extract a number from the response
                    console.log('checkJobMatch: Trying to extract match score from text');
                    const match = textResponse.match(/["']?matchScore["']?\s*[:=]\s*(\d+(\.\d+)?)/i);
                    if (match) {
                        const matchScore = parseFloat(match[1]);
                        console.log('checkJobMatch: Extracted match score from text:', matchScore);
                        return matchScore >= minMatchScore ? matchScore : false;
                    }
                    
                    // Fallback: Return a default match score to continue processing
                    console.log('checkJobMatch: Could not extract match score, using default match score');
                    return 4; // Return a medium match score to continue processing
                }
            } catch (error) {
                console.error('checkJobMatch: Gemini API Error:', error);
                // Fallback: Return a default match score to continue processing
                console.log('checkJobMatch: Gemini API error, using default match score');
                return 4; // Return a medium match score to continue processing
            }
        }
    } catch (error) {
        console.error('checkJobMatch: Error in checkJobMatch:', error);
        // Fallback: Return a default match score to continue processing
        console.log('checkJobMatch: General error in checkJobMatch, using default match score');
        return 4; // Return a medium match score to continue processing
    }
}

export {
    clickJob,
    getDailyJobCount,
    goToNextPage,
    handleScriptTermination,
    updateDailyJobCount,
    fetchJobDetails,
    checkJobMatch,
    isJobApplied
};