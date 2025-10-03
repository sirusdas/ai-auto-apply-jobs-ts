// Job processing functionality for the auto-apply extension

import { isScriptRunning, timeoutReached, DAILY_LIMIT } from './core';
import { getDailyJobCount, updateDailyJobCount, checkDailyLimit } from './utils/storage';
import { addDelay, addShortDelay, goToNextPage, handleScriptTermination } from './utils/navigation';
import { runValidations } from './formHandling';

export {
    addDelay,
    addShortDelay,
    goToNextPage,
    handleScriptTermination,
    getDailyJobCount,
    updateDailyJobCount,
    checkDailyLimit,
    runValidations
};

// Function to click on a job
export async function clickJob(job: Element) {
    return new Promise<void>(async (resolve) => {
        if (!isScriptRunning) {
            resolve();
            return;
        }

        console.log('Clicking job...');
        (job as HTMLElement).click();
        await addDelay();

        // Try to click the Easy Apply button
        const easyApplyButton = document.querySelector('button.jobs-apply-button') as HTMLElement | null;
        if (easyApplyButton) {
            console.log('Clicking Easy Apply button...');
            easyApplyButton.click();
            await addDelay();
        } else {
            console.log('Easy Apply button not found');
            resolve();
            return;
        }

        resolve();
    });
}

// Function to scroll and fetch job details
export async function scrollAndFetchJobDetails(jobList: Element[]) {
    return new Promise<{currentIndex: number, jobDetails: any[], company_names: string[]}>(async (resolve) => {
        if (!isScriptRunning) {
            resolve({currentIndex: 0, jobDetails: [], company_names: []});
            return;
        }

        console.log('Scrolling to fetch job details...');
        for (const job of jobList) {
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await addDelay();
        }

        // Return mock data for now
        resolve({currentIndex: 0, jobDetails: [], company_names: []});
    });
}

// Function to check if job is already applied
export function isJobApplied(jobElement: Element): boolean {
    const appliedStatusElement = jobElement.querySelector('.job-card-container__footer-job-state');
    if (appliedStatusElement) {
        const appliedStatus = appliedStatusElement.textContent?.trim().toLowerCase();
        return appliedStatus === 'applied';
    }
    return false;
}

// Function to fetch job details
export async function fetchJobDetails() {
    try {
        // Get job title
        const jobTitleElement = document.querySelector('h2.jobs-unified-top-card__job-title a, .job-details-jobs-unified-top-card__job-title a');
        const jobTitle = jobTitleElement ? jobTitleElement.textContent?.trim() : '';

        // Get company name
        const companyElement = document.querySelector('.jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name a');
        const company = companyElement ? companyElement.textContent?.trim() : '';

        // Get location
        const locationElement = document.querySelector('.jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__bullet');
        const location = locationElement ? locationElement.textContent?.trim() : '';

        // Try to expand job description
        const showMoreButton = document.querySelector('button.jobs-description-details__footer-button, button[data-testid="jobs-description-details-show-more-button"]') as HTMLElement | null;
        if (showMoreButton) {
            showMoreButton.click();
            await addShortDelay();
        }

        // Get job description
        const descriptionElement = document.querySelector('.jobs-description-content__text, .job-details-jobs-unified-top-card__job-description');
        const description = descriptionElement ? descriptionElement.textContent?.trim() : '';

        // Check if Easy Apply is available
        const easyApplyButton = document.querySelector('button.jobs-apply-button');
        const isEasyApply = !!easyApplyButton;

        return {
            jobTitle,
            company,
            location,
            description,
            isEasyApply
        };
    } catch (error) {
        console.error('Error fetching job details:', error);
        return false;
    }
}

// Function to check job match using AI
export async function checkJobMatch(jobDetails: any, resume: any): Promise<number | false> {
    console.log('Starting job match check...');
    
    try {
        // Get access token
        const accessToken = await new Promise<string | null>((resolve) => {
            chrome.storage.local.get('accessToken', result => {
                resolve(result.accessToken || null);
            });
        });

        if (!accessToken) {
            console.warn('Access token not found, skipping job match check.');
            return false;
        }

        // Get minimum match score
        const minMatchScore: number = await new Promise<number>((resolve) => {
            chrome.storage.local.get('minMatchScore', result => {
                resolve(result.minMatchScore ? parseInt(result.minMatchScore, 10) : 3);
            });
        });
        console.log('minMatchScore:', minMatchScore);

        console.log('Sending job match request to API...');
        
        // Get API token
        const apiToken = await new Promise<string | null>((resolve) => {
            chrome.storage.local.get(['apiToken'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error:', chrome.runtime.lastError);
                    resolve(null);
                } else {
                    const encryptedToken = result.apiToken;
                    resolve(encryptedToken ? atob(encryptedToken) : null); // Simple base64 decode
                }
            });
        });

        if (!apiToken) {
            throw new Error('API token not found');
        }

        // Retrieve the token type from storage
        const planType = await new Promise<string>((resolve) => {
            chrome.storage.local.get('planType', result => {
                resolve(result.planType || 'Free'); // Default to 'Free' if not found
            });
        });

        // Helper function to get the selected model
        async function getSelectedGeminiModel(): Promise<string> {
            return new Promise((resolve) => {
                chrome.storage.local.get('geminiModel', function(result) {
                    resolve(result.geminiModel || 'gemini-2.0-flash-lite'); // Updated to use a more capable model
                });
            });
        }

        let matchScore: number | false = false;

        // Enhanced prompt with clearer instructions
        const aiPrompt = `Based on the provided resume and job description, analyze if this is a good match.
        
        Requirements:
        1. The company must be a primary product-based company (IT or non-IT) or non-IT based service company
        2. Provide a detailed analysis of the match score
        3. Output MUST be in the exact JSON format specified below
        
        Output Format:
        {"company_name":"string","company_type":"service/product","industry":"IT/Non-IT","match_score":number,"reasoning":"string"}
        
        Resume: ${JSON.stringify(resume)}
        Job Description: 
        Title: ${jobDetails.jobTitle}
        Description: ${jobDetails.description}
        Company: ${jobDetails.company}
        
        NOTE: Format the output as valid JSON ONLY, with no additional text.`;

        if (planType.toLowerCase() === 'pro') {
            try {
                // Use the custom AI tool
                const customApiUrl = 'https://qerds.com/tools/tgs/api/ai';
                const requestBody = {
                    query: aiPrompt
                };

                const response = await fetch(customApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiToken
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Custom AI API Error Response:', errorData);
                    throw new Error(`Custom AI API request failed: ${response.status} ${response.statusText}. ${errorData?.message || ''}`);
                }

                const data = await response.json();
                const contentText = data?.data?.text;

                // Extract JSON from response
                const match = contentText.match(/```json\n([\s\S]*?)\n```/);
                const jsonString = match ? match[1] : null;

                if (!jsonString) {
                    console.error('Custom AI API Response:', data);
                    return false;
                }

                try {
                    const parsedContent = JSON.parse(jsonString);
                    
                    // Validate response format
                    if (!parsedContent || typeof parsedContent.match_score !== 'number') {
                        throw new Error('Invalid response format from AI API');
                    }
                    
                    const score: number = parsedContent.match_score;
                    matchScore = score;
                    
                    // Log detailed reasoning from AI
                    if (parsedContent.reasoning) {
                        console.log('AI Analysis:', parsedContent.reasoning);
                    }

                    console.log('Job Match Score:', matchScore);
                    return matchScore >= minMatchScore ? matchScore : false;
                } catch (parseError) {
                    console.error('Error parsing AI response:', parseError);
                    console.error('Problematic JSON:', jsonString);
                    return false;
                }
            } catch (error) {
                console.error('Custom AI API Error:', error);
                return false;
            }
        } else {
            try {
                console.log('Sending request to Gemini API...');
                // Get the selected model
                const selectedModel = await getSelectedGeminiModel();
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${accessToken}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: aiPrompt
                            }]
                        }]
                    })
                });

                await addDelay();

                if (!response.ok) {
                    throw new Error(`API error: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Received AI response:', result);

                const contentText = result.candidates[0].content.parts[0].text.trim();
                const match = contentText.match(/```json\n([\s\S]*?)\n```/);
                const jsonString = match ? match[1] : null;

                if (!jsonString) {
                    console.error('Gemini API Response:', result);
                    return false;
                }

                try {
                    const parsedContent = JSON.parse(jsonString);
                    
                    // Validate response format
                    if (!parsedContent || typeof parsedContent.match_score !== 'number') {
                        throw new Error('Invalid response format from Gemini API');
                    }
                    
                    const score: number = parsedContent.match_score;
                    matchScore = score;
                    
                    // Log detailed reasoning from AI
                    if (parsedContent.reasoning) {
                        console.log('AI Analysis:', parsedContent.reasoning);
                    }

                    console.log('Job Match Score:', matchScore);
                    return matchScore >= minMatchScore ? matchScore : false;
                } catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    console.error('Problematic JSON:', jsonString);
                    return false;
                }
            } catch (error) {
                console.error('Gemini API Error:', error);
                return false;
            }
        }
    } catch (error) {
        console.error('Error in checkJobMatch:', error);
        return false;
    }
}