// Job discovery functionality for the auto-apply extension

import { addShortDelay } from '../core';

// Function to scroll job panel
export async function jobPanelScroll() {
    let currentIndex = 0;
    let jobDetails: any[] = [];
    let company_names: string[] = [];

    const listItem = document.querySelector('.scaffold-layout__list-item');
    if (listItem) {
        // Find the parent container
        const jobsPanel = listItem.closest('ul');
        if (jobsPanel) {
            console.log('Scrolling job panel to load more jobs');
            // Scroll multiple times to load all jobs
            for (let i = 0; i < 5; i++) {
                const scrollHeightBefore = jobsPanel.scrollHeight;
                jobsPanel.scrollTop = jobsPanel.scrollHeight;
                await addShortDelay();

                // Check if new jobs loaded
                const scrollHeightAfter = jobsPanel.scrollHeight;
                if (scrollHeightBefore === scrollHeightAfter) {
                    console.log('No more jobs to load after scroll attempt', i + 1);
                    break;
                } else {
                    console.log('Jobs loaded after scroll attempt', i + 1);
                }
            }
        }
    } else {
        console.log('No job list items found on page');
    }

    // Collect job details
    const jobElements = document.querySelectorAll('.scaffold-layout__list-item');
    console.log(`Found ${jobElements.length} job elements`);

    jobElements.forEach((element: Element, index) => {
        try {
            const jobTitleElement = element.querySelector('.artdeco-entity-lockup__title a');
            const jobTitle = jobTitleElement ? jobTitleElement.textContent?.trim() : '';

            const companyNameElement = element.querySelector('.artdeco-entity-lockup__subtitle span');
            const companyName = companyNameElement ? companyNameElement.textContent?.trim() : '';

            const appliedStatusElement = element.querySelector('.job-card-container__footer-job-state');
            const appliedStatus = appliedStatusElement ? appliedStatusElement.textContent?.trim() : '';

            if (jobTitle && companyName) {
                jobDetails.push({ jobTitle, companyName, appliedStatus });
                if (!company_names.includes(companyName)) {
                    company_names.push(companyName);
                }
                console.log(`Job ${index + 1}: ${jobTitle} at ${companyName}`);
            } else {
                console.log(`Skipping job ${index + 1} due to missing title or company name`);
            }
        } catch (error) {
            console.error(`Error extracting job details for job ${index + 1}:`, error);
        }
    });

    console.log(`Total jobs collected: ${jobDetails.length}`);
    console.log(`Unique companies: ${company_names.length}`);

    return { currentIndex, jobDetails, company_names };
}

// Function to filter jobs by company type (product/service)
export async function filterJobsByCompanyType(company_names: string[]) {
    // Get user preferences for company types
    const companyPreferences: any = await new Promise(resolve => {
        chrome.storage.local.get(['applyToProductCompanies', 'applyToServiceCompanies'], (result) => {
            resolve({
                applyToProductCompanies: result.applyToProductCompanies !== undefined ? result.applyToProductCompanies : true,
                applyToServiceCompanies: result.applyToServiceCompanies !== undefined ? result.applyToServiceCompanies : true
            });
        });
    });

    console.log('Company preferences:', companyPreferences);

    // For now, we'll return all companies since we don't have the AI filtering implementation
    // In a full implementation, this would use the AI API to categorize companies
    return company_names;
}

// Function to scroll and fetch job details
export async function scrollAndFetchJobDetails() {
    console.log('Scrolling and fetching jobs...');
    const { currentIndex, jobDetails, company_names } = await jobPanelScroll();

    const filteredJobDetails = jobDetails.filter(job => {
        if (job.appliedStatus) {
            return job.appliedStatus.toLowerCase().trim() !== 'applied';
        }
        return true;
    });

    console.log("Job Details: ", filteredJobDetails);
    console.log("Company Names: ", company_names);

    // Filter jobs by company type preferences
    const filteredCompanies = await filterJobsByCompanyType(company_names);
    console.log('Filtered companies based on preferences:', filteredCompanies);

    return { currentIndex, jobDetails: filteredJobDetails, company_names: filteredCompanies };
}

// Function to filter jobs using AI (product vs service companies)
export async function filterJobsAI(company_names: string[]) {
    console.log('Searching with AI for company categories...');
    
    try {
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
                    resolve(result.geminiModel || 'gemma-3-27b-it'); // Default model
                });
            });
        }

        if (planType.toLowerCase() === 'pro') {
            try {
                // Use the custom AI tool
                const customApiUrl = 'https://qerds.com/tools/tgs/api/ai';
                const requestBody = {
                    query: `Find the company category(product based or service based also mention their industries and add a parameter is_it as (true or false, based on IT or non-IT) and output as a json as {"product_companies": [{"company_name":"","industry":"", is_it: true}], "service_companies": [...]}  for the below companies: ${JSON.stringify(company_names)}. NOTE: Format the output as valid JSON ONLY.`
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
                    return { productCompanies: [], serviceCompanies: [] };
                }

                const parsedContent = JSON.parse(jsonString);
                return {
                    productCompanies: parsedContent?.product_companies || [],
                    serviceCompanies: parsedContent?.service_companies || []
                };
            } catch (error) {
                console.error('Custom AI API Error:', error);
                return { productCompanies: [], serviceCompanies: [] };
            }
        } else {
            const accessToken = await new Promise<string | null>((resolve) => {
                chrome.storage.local.get('accessToken', result => {
                    resolve(result.accessToken || null);
                });
            });

            if (!accessToken) {
                console.warn('Access token not found, skipping AI processing.');
                return { productCompanies: [], serviceCompanies: [] };
            }

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
                                text: `Find the company category(product based or service based also mention their industries and add a parameter is_it as (true or false, based on IT or non-IT) and output as a json as {"product_companies": [{"company_name":"","industry":"", is_it: true}], "service_companies": [...]}  for the below companies: ${JSON.stringify(company_names)}. NOTE: Format the output as valid JSON ONLY.`
                            }]
                        }]
                    })
                });

                await addShortDelay();

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
                    return { productCompanies: [], serviceCompanies: [] };
                }

                const parsedContent = JSON.parse(jsonString);
                return {
                    productCompanies: parsedContent?.product_companies || [],
                    serviceCompanies: parsedContent?.service_companies || []
                };
            } catch (error) {
                console.error('Gemini API Error:', error);
                return { productCompanies: [], serviceCompanies: [] };
            }
        }
    } catch (error) {
        console.error('Error in filterJobsAI:', error);
        return { productCompanies: [], serviceCompanies: [] };
    }
}