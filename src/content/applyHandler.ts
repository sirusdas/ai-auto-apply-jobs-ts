
import { addDelay, addShortDelay, addVeryShortDelay } from '../utils/delay';

interface QuestionData {
    inputs: string[];
    radios: string[];
    dropdowns: string[];
    checkboxes: string[];
}

interface Answers {
    inputs: Record<string, string>;
    radios: Record<string, string>;
    dropdowns: Record<string, string>;
    checkboxes: Record<string, string>;
}

export async function checkForError(): Promise<boolean> {
    // Look for error containers or strictly error-themed feedback
    const feedback = document.querySelector('.artdeco-inline-feedback--error, .artdeco-inline-feedback__message--error');
    if (!feedback) return false;

    // Check if the feedback is actually visible and not just hidden in the DOM
    const htmlElement = feedback as HTMLElement;
    const isVisible = htmlElement.offsetParent !== null;

    if (isVisible) {
        console.warn('Strict Error Detected:', htmlElement.textContent?.trim());
    }

    return isVisible;
}

export async function uncheckFollowCompany() {
    const checkbox = document.querySelector('#follow-company-checkbox') as HTMLInputElement;
    if (checkbox && checkbox.checked) {
        checkbox.click();
    }
}


// --- Main Handler ---

export async function handleEasyApplyModal(jobDetails: any, shouldStop?: () => boolean) {
    console.log('--- Handling Easy Apply Modal (Two-Pass System) ---');

    // Log all job details for debugging
    console.log('Job Details:', JSON.stringify(jobDetails, null, 2));

    // Store job identification information to ensure we can re-select the job if needed
    const jobId = jobDetails.jobId;
    const jobTitle = jobDetails.jobTitle;
    const company = jobDetails.company;
    console.log(`Stored job info - ID: ${jobId}, Title: ${jobTitle}, Company: ${company}`);

    // Log current page state
    console.log('Initial page state:');
    logPageState();

    if (shouldStop && shouldStop()) {
        console.log('Process stopped by user.');
        return;
    }

    // 1. Dry Run: Gather all questions by filling dummy data
    console.log('Phase 1: Starting Dry Run...');
    const collectedQuestions = await performDryRun(jobDetails, shouldStop);

    // If dry run failed or returned null (e.g. already submitted?), stop
    if (!collectedQuestions) {
        console.error('Phase 1 Failed: Dry run returned null (failed or submitted prematurely).');
        // Ensure the modal is closed before moving to the next job
        await discardApplication();
        return;
    }

    if (shouldStop && shouldStop()) { console.log('Process stopped.'); return; }

    console.log('Phase 1 Success: Questions collected:', collectedQuestions);

    // Check if we actually collected any questions. 
    // If NOT, and we reached Submit, it means the form was pre-filled or requires no input.
    // In this case, we SHOULD NOT discard, because we didn't enter dummy data (assuming gather checks found nothing).
    // We can just proceed to submit using the CURRENTLY OPEN modal.
    const hasQuestions = collectedQuestions.inputs.length > 0 || collectedQuestions.radios.length > 0 || collectedQuestions.dropdowns.length > 0 || collectedQuestions.checkboxes.length > 0;
    console.log(`Has questions: ${hasQuestions}`, {
        inputs: collectedQuestions.inputs.length,
        radios: collectedQuestions.radios.length,
        dropdowns: collectedQuestions.dropdowns.length,
        checkboxes: collectedQuestions.checkboxes.length
    });

    if (!hasQuestions) {
        console.log('No questions collected (Simple Apply or Pre-filled). Skipping Discard/Reopen phases. Proceeding to Submit...');
        // We skip Phase 2 (Discard), Phase 3 (AI), Phase 4 (Reopen).
        // Direct to Phase 5.
        console.log('Phase 5: Starting Real Run (Direct Submit)...');
        await performRealRun({ inputs: {}, radios: {}, dropdowns: {}, checkboxes: {} }, jobDetails, shouldStop);
        await closePostSubmissionModals();
        console.log('--- Handle Easy Apply Modal Process Finished ---');
        return;
    }

    // 2. Discard the dry-run application
    console.log('Phase 2: Discarding dry-run application...');
    await discardApplication();
    await addDelay();

    // Log page state after discard
    console.log('Page state after discard:');
    logPageState();

    if (shouldStop && shouldStop()) { console.log('Process stopped.'); return; }

    // 3. Get AI Answers
    console.log('Phase 3: Fetching AI answers...');
    const answers = await fetchAIAnswers(collectedQuestions, jobDetails);
    if (!answers) {
        console.error('Phase 3 Failed: No answers received from AI.');
        return;
    }
    console.log('Phase 3 Success: AI Answers received.');

    if (shouldStop && shouldStop()) { console.log('Process stopped.'); return; }

    // 4. Re-open Easy Apply
    console.log('Phase 4: Re-opening Easy Apply for Real Run...');

    // Check current page state before attempting to re-open
    console.log('Checking page state before re-opening Easy Apply:');
    logPageState();

    // Check if we're still on the job details page, if not, re-select the job
    if (!isOnJobDetailsPage(jobId, jobTitle, company)) {
        console.log('Detected page navigation away from job details. Re-selecting job...');
        const reselected = await reselectJob(jobId, jobTitle, company);
        if (!reselected) {
            console.error('Failed to re-select job. Cannot continue with application.');
            return;
        }
        // Wait a bit for the page to settle
        await addShortDelay();

        // Log page state after re-selection
        console.log('Page state after re-selecting job:');
        logPageState();
    } else {
        console.log('Still on job details page. Continuing with re-opening Easy Apply...');
    }

    const reopened = await reopenEasyApply();
    if (!reopened) {
        console.error('Phase 4 Failed: Could not reopen Easy Apply modal.');
        // Log final state for debugging
        console.log('Final page state after failed re-open attempt:');
        logPageState();
        return;
    }
    await addDelay();

    if (shouldStop && shouldStop()) { console.log('Process stopped.'); return; }

    // 5. Real Run: Fill with AI answers and Submit
    console.log('Phase 5: Starting Real Run with AI answers...');

    // Create a flag to control the periodic check
    let stopPeriodicCheck = false;

    // Start periodic check for post-submission modals
    const periodicCheckPromise = periodicallyCheckAndCloseModals(() => stopPeriodicCheck);

    try {
        await performRealRun(answers, jobDetails, shouldStop);
    } finally {
        // Stop the periodic check
        stopPeriodicCheck = true;
        await periodicCheckPromise;
    }

    console.log('--- Handle Easy Apply Modal Process Finished ---');
}

// --- Phase 1: Dry Run ---

async function performDryRun(jobDetails: any, shouldStop?: () => boolean): Promise<QuestionData | null> {
    console.log(`DryRun: Starting for ${jobDetails.jobTitle} at ${jobDetails.company}...`);
    const collected: QuestionData = { inputs: [], radios: [], dropdowns: [], checkboxes: [] };
    const dryRunAnswers: Answers = { inputs: {}, radios: {}, dropdowns: {}, checkboxes: {} };
    let attempts = 0;
    const maxAttempts = 50;

    // We expect the modal.
    const modal = document.querySelector('.artdeco-modal');
    if (!modal && !await waitForModal()) {
        console.error('DryRun: Modal never appeared.');
        return null;
    }

    while (attempts < maxAttempts) {
        if (shouldStop && shouldStop()) return null;

        attempts++;
        console.log(`DryRun: Processing Form Page ${attempts}`);
        await addVeryShortDelay();
        await performSafetyReminderCheck();

        // Scope finds to the modal to avoid clicking background buttons
        const currentModal = document.querySelector('.artdeco-modal') as HTMLElement;
        if (!currentModal) {
            console.log('DryRun: Modal closed/lost.');
            break;
        }

        const submitBtn = findButton('Submit application', currentModal) || findButton('Submit', currentModal);

        // IMPORTANT: If we found Submit, we are done collecting.
        if (submitBtn) {
            console.log('Dry run reached Submit button. Stopping collection.');
            return collected;
        }

        const nextBtn = findButton('Next', currentModal) || findButton('Review', currentModal) || findButton('Continue to next step', currentModal);

        // Collect questions on current page
        const inputQuestions = await gatherInputFieldChecks();
        const radioQuestions = await gatherRadioButtonChecks();
        const dropdownQuestions = await gatherDropdownChecks();
        const checkboxQuestions = await gatherCheckboxChecks();

        collected.inputs.push(...inputQuestions);
        collected.radios.push(...radioQuestions);
        collected.dropdowns.push(...dropdownQuestions);
        collected.checkboxes.push(...checkboxQuestions);

        // Fill current page with dummy data to proceed
        await fillDummyData();

        // Also apply any AI answers we've gathered so far in this dry run
        await performInputFieldChecks(dryRunAnswers.inputs);
        await performRadioButtonChecks(dryRunAnswers.radios);
        await performDropdownChecks(dryRunAnswers.dropdowns);
        await performCheckboxChecks(dryRunAnswers.checkboxes);

        if (nextBtn) {
            console.log('DryRun: Clicking Next/Review button inside modal...');
            nextBtn.click();
            await addShortDelay();

            // Check for error blocking progress
            if (await checkForError()) {
                const errorMsg = document.querySelector('.artdeco-inline-feedback__message')?.textContent?.trim();
                console.warn(`Dry run blocked by error: "${errorMsg}". Attempting AI retry...`);

                // Attempt AI-driven retry even in dry run
                const retryAttempted = await handleValidationRetry(dryRunAnswers, jobDetails);
                if (retryAttempted) {
                    console.log('DryRun: AI retry filled fields. Clicking Next again...');
                    nextBtn.click();
                    await addShortDelay();
                    if (await checkForError()) {
                        console.error('DryRun: Error persists after AI retry. Aborting.');
                        return null;
                    }
                } else {
                    console.error('DryRun: AI retry not possible or failed. Aborting.');
                    return null;
                }
            }
        } else {
            // Maybe "Continue applying" on external site?
            if (findButton('Continue applying', currentModal)) {
                console.log('External application detected. Aborting.');
                return null;
            }
            // Stuck?
            if (attempts > 5 && !document.querySelector('.fb-dash-form-element') && !document.querySelector('.artdeco-modal')) {
                console.log('Dry run stuck (no form elements or modal closed).');
                return null;
            }
            // If we are still here and no next button, maybe we are stuck on a page?
            if (!nextBtn && attempts > 1) {
                console.log('DryRun: No Next button found and not Submit.');
                // one last check for submit in case text varies
                break;
            }
        }
    }
    console.error('DryRun: Max attempts reached.');
    return collected;
}

// --- Phase 2: Discard ---

async function discardApplication() {
    console.log('Starting discard process...');
    let attempts = 0;
    const maxDiscardAttempts = 3;

    while (attempts < maxDiscardAttempts) {
        const modal = document.querySelector('.artdeco-modal');
        if (!modal) {
            console.log('Discard: No modal found, potentially already closed.');
            break;
        }

        // 1. Click Dismiss (X)
        const dismiss = modal.querySelector('.artdeco-modal__dismiss') as HTMLElement;
        if (dismiss) {
            console.log('Discard: Clicking Dismiss (X)...');
            dismiss.click();
            await addShortDelay();
        }

        // 2. Click Discard confirmation button
        // LinkedIn shows a "Save this application?" or direct discard confirmation
        const confirmationButtons = Array.from(document.querySelectorAll('button'));
        const discardConfirmBtn = confirmationButtons.find(b =>
            b.innerText.trim().toLowerCase() === 'discard' ||
            b.getAttribute('data-control-name') === 'discard_application_confirm_btn' ||
            b.innerText.trim().toLowerCase() === 'no' // Sometimes "Save?" -> "No"
        ) as HTMLElement;

        if (discardConfirmBtn) {
            console.log('Discard: Clicking Discard Confirm button...');
            discardConfirmBtn.click();
            await addShortDelay();
        }

        // Check if modal still exists
        const remainingModal = document.querySelector('.artdeco-modal');
        if (!remainingModal) {
            console.log('Discard: Modal successfully closed.');
            return;
        }

        attempts++;
        console.warn(`Discard: Modal still present (Attempt ${attempts}/${maxDiscardAttempts}). Retrying...`);
        await addShortDelay();
    }

    // Final check for the "Save this application?" specific modal
    const confirmationModal = Array.from(document.querySelectorAll('.artdeco-modal')).find(m =>
        m.textContent?.includes('Save this application?') || m.textContent?.includes('Discard')
    );
    if (confirmationModal) {
        console.log('Discard: Found persistent confirmation modal. Forcing close...');
        const skip = confirmationModal.querySelector('button[data-control-name="discard_application_confirm_btn"]') as HTMLElement ||
            Array.from(confirmationModal.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'discard');
        if (skip) skip.click();
        await addShortDelay();
    }
}

// --- Phase 3: AI Fetch ---

async function fetchAIAnswers(questions: QuestionData, jobDetails: any): Promise<Answers | null> {
    const tokenRes = await chrome.storage.local.get(['accessToken', 'compressedResumeYAML', 'plainTextResume']);
    if (!tokenRes.accessToken) return null;

    try {
        const response: any = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'answerJobQuestions',
                inputs: questions.inputs,
                radios: questions.radios,
                dropdowns: questions.dropdowns,
                checkboxes: questions.checkboxes,
                resume: tokenRes.compressedResumeYAML || tokenRes.plainTextResume || "",
                accessToken: tokenRes.accessToken
            }, (res) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else if (res && res.success) resolve(res.data);
                else reject(res?.error);
            });
        });
        return response;
    } catch (e) {
        console.error('AI Fetch Error:', e);
        return null;
    }
}

// --- Phase 4: Re-open ---

export async function reopenEasyApply(): Promise<boolean> {
    console.log('Starting reopenEasyApply function...');
    await addVeryShortDelay(); // Ensure UI is stable after modal dismissal

    // Log current state before attempting to reopen
    console.log('Current state before reopen attempt:');
    logPageState();

    // Selectors for the job details container
    const containerSelectors = [
        '.job-details-jobs-unified-top-card',
        '.jobs-search__job-details--container', // Split view
        '.jobs-details__main-content' // General container
    ];

    console.log('Container selectors to search:', containerSelectors);

    let visibleBtn: HTMLElement | undefined;

    // 1. Scoped Search - Look for Easy Apply button in job details container
    console.log('Step 1: Performing scoped search for Easy Apply button...');
    for (const selector of containerSelectors) {
        console.log(`Checking container: ${selector}`);
        const container = document.querySelector(selector);
        if (container) {
            console.log(`Found container: ${selector}`);
            const buttons = Array.from(container.querySelectorAll('button'));
            console.log(`Found ${buttons.length} buttons in container`);

            visibleBtn = buttons.find(b =>
                b instanceof HTMLElement &&
                b.innerText.trim().includes('Easy Apply') &&
                !b.closest('.artdeco-pill') && // Exclude filters
                b.offsetParent !== null
            ) as HTMLElement | undefined;

            if (visibleBtn) {
                console.log(`Reopen: Found button in container '${selector}'`);
                console.log('Found button details:', {
                    text: visibleBtn.innerText.trim(),
                    classes: Array.from(visibleBtn.classList),
                    id: visibleBtn.id
                });
                break;
            } else {
                console.log(`No Easy Apply button found in container '${selector}'`);
            }
        } else {
            console.log(`Container not found: ${selector}`);
        }
    }

    // 2. Global Fallback - Search for Easy Apply button anywhere on page, but exclude filters
    if (!visibleBtn) {
        console.log('Step 2: Scoped search failed. Trying global button search with strict filtering...');
        const buttons = Array.from(document.querySelectorAll('button'));
        console.log(`Found ${buttons.length} total buttons on page`);

        visibleBtn = buttons.find(b => {
            if (!(b instanceof HTMLElement)) {
                console.log('Skipping non-HTMLElement button');
                return false;
            }

            const text = b.innerText.trim();
            const isEasyApply = text.includes('Easy Apply');
            const isFilter = b.id?.includes('searchFilter') ||
                b.classList.contains('artdeco-pill') ||
                b.getAttribute('aria-label')?.includes('filter') ||
                b.closest('.search-reusables__filter-pill-button') ||
                b.hasAttribute('data-test-filter');
            const isVisible = b.offsetParent !== null;

            console.log('Evaluating button:', {
                text,
                isEasyApply,
                isFilter,
                isVisible,
                classes: Array.from(b.classList),
                id: b.id
            });

            return isEasyApply && !isFilter && isVisible;
        }) as HTMLElement | undefined;

        if (visibleBtn) {
            console.log('Found Easy Apply button with global search');
        }
    }

    // 3. Additional fallback - look for the job apply button specifically by data attributes
    if (!visibleBtn) {
        console.log('Step 3: Trying data-job-id attribute search...');
        const jobApplyButtons = Array.from(document.querySelectorAll('button[data-job-id]'));
        console.log(`Found ${jobApplyButtons.length} buttons with data-job-id attribute`);

        visibleBtn = jobApplyButtons.find(b => {
            if (!(b instanceof HTMLElement)) return false;

            const text = b.innerText.trim();
            const isEasyApply = text.includes('Easy Apply');
            const isVisible = b.offsetParent !== null;

            console.log('Evaluating data-job-id button:', {
                text,
                isEasyApply,
                isVisible,
                jobId: b.getAttribute('data-job-id'),
                classes: Array.from(b.classList),
                id: b.id
            });

            return isEasyApply && isVisible;
        }) as HTMLElement | undefined;

        if (visibleBtn) {
            console.log('Found Easy Apply button with data-job-id search');
        }
    }

    // 4. Last resort - try to find any visible button with "Easy Apply" text, even if it might be a filter
    if (!visibleBtn) {
        console.log('Step 4: Trying last resort search for any visible Easy Apply button...');
        const allButtons = Array.from(document.querySelectorAll('button'));
        console.log(`Found ${allButtons.length} total buttons for last resort search`);

        visibleBtn = allButtons.find(b => {
            if (!(b instanceof HTMLElement)) return false;

            const text = b.innerText.trim();
            const isEasyApply = text.includes('Easy Apply');
            const isVisible = b.offsetParent !== null;

            console.log('Evaluating button in last resort search:', {
                text,
                isEasyApply,
                isVisible,
                classes: Array.from(b.classList),
                id: b.id
            });

            return isEasyApply && isVisible;
        }) as HTMLElement | undefined;

        if (visibleBtn) {
            console.log('Found Easy Apply button with last resort search');
        }
    }

    if (visibleBtn) {
        console.log('Reopen: Clicking Easy Apply...', visibleBtn);
        // Adding a small delay before clicking to ensure the UI is ready
        await addShortDelay();
        visibleBtn.click();

        // Wait for modal
        console.log('Waiting for modal to appear after clicking Easy Apply button...');
        const modalOpen = await waitForModal();
        console.log('Modal open result:', modalOpen);
        return modalOpen;
    }

    console.error('Reopen: No visible Easy Apply button found.');

    // Log additional debugging information
    console.log('Reopen: Debug info:');
    console.log('- Number of buttons on page:', document.querySelectorAll('button').length);
    const easyApplyButtons = Array.from(document.querySelectorAll('button')).filter(b =>
        b instanceof HTMLElement && b.innerText.trim().includes('Easy Apply')
    ) as HTMLElement[];
    console.log('- Buttons containing "Easy Apply":', easyApplyButtons.length);
    easyApplyButtons.forEach((btn, i) => {
        console.log(`  ${i + 1}. Text: "${btn.innerText.trim()}", Visible: ${btn.offsetParent !== null}, Classes:`, Array.from(btn.classList));
    });

    // Check if we're on a job search/results page vs. job details page
    const isOnSearchPage = !!document.querySelector('.jobs-search-results-list');
    const isOnJobDetailsPage = !!document.querySelector('.job-details-jobs-unified-top-card');
    console.log(`Reopen: Current page type - Search: ${isOnSearchPage}, Job Details: ${isOnJobDetailsPage}`);

    // Log all job-related elements
    const jobDetailContainers = document.querySelectorAll('.job-details-jobs-unified-top-card, .jobs-search__job-details--container, .jobs-details__main-content');
    console.log(`Found ${jobDetailContainers.length} job detail containers:`, Array.from(jobDetailContainers).map((el, i) => ({
        index: i,
        tagName: el.tagName,
        className: el.className,
        id: el.id
    })));

    // Try one more thing - check if there's a job card list item that might contain the job
    const jobListItem = document.querySelector('[data-occludable-job-id]');
    if (jobListItem) {
        console.log('Found job list item, trying to click it to refresh job details:', jobListItem);
        (jobListItem as HTMLElement).click();
        await addShortDelay();

        // Try to find the button again
        const retryButton = document.querySelector('button.jobs-apply-button:not(.artdeco-pill)');
        if (retryButton) {
            console.log('Found Easy Apply button after clicking job list item:', retryButton);
            await addShortDelay();
            (retryButton as HTMLElement).click();
            const modalOpen = await waitForModal();
            return modalOpen;
        }
    }

    return false;
}

// --- Phase 5: Real Run ---

async function performRealRun(answers: Answers, jobDetails: any, shouldStop?: () => boolean) {
    console.log('Starting performRealRun with answers:', answers);
    let attempts = 0;
    const maxAttempts = 100;

    console.log('Checking if modal is open before starting real run...');
    if (!await waitForModal()) {
        console.error('RealRun: Modal not open.');
        return;
    }

    // Prepare form data to be saved
    const formData = {
        inputs: [] as any[],
        radios: [] as any[],
        dropdowns: [] as any[],
        checkboxes: [] as any[],
        submittedAt: new Date().toISOString()
    };

    while (attempts < maxAttempts) {
        console.log(`RealRun: Starting attempt ${attempts + 1}/${maxAttempts}`);

        if (shouldStop && shouldStop()) {
            console.log('RealRun: Process stopped by user.');
            return;
        }

        attempts++;
        console.log(`RealRun: Processing Form Page ${attempts}`);
        await addVeryShortDelay();
        await performSafetyReminderCheck();
        await validateAndCloseConfirmationModal();

        const currentModal = document.querySelector('.artdeco-modal') as HTMLElement;
        if (!currentModal) {
            console.log('RealRun: Modal closed/lost.');
            return;
        }

        // Log current form state
        console.log('RealRun: Current form state:');
        logFormState(currentModal);

        // Capture form elements for saving
        const formElements = getFormElements(currentModal);

        // Add inputs to form data
        formElements.inputs.forEach((input: any) => {
            formData.inputs.push({
                type: input.type,
                name: input.name,
                value: input.value,
                placeholder: input.placeholder
            });
        });

        // Add radios to form data
        formElements.radioGroups.forEach((radioGroup: any) => {
            formData.radios.push({
                name: radioGroup.name,
                selectedValue: radioGroup.selectedValue,
                options: radioGroup.options
            });
        });

        // Add dropdowns to form data
        formElements.selects.forEach((select: any) => {
            formData.dropdowns.push({
                name: select.name,
                selectedValue: select.value,
                options: select.options
            });
        });

        // Add checkboxes to form data? getFormElements doesn't gather them yet.
        // We'll skip for now or update getFormElements if needed for logging.

        // Fill Data using Answers
        console.log('RealRun: Filling input fields...');
        await performInputFieldChecks(answers.inputs);
        console.log('RealRun: Filling radio buttons...');
        await performRadioButtonChecks(answers.radios);
        console.log('RealRun: Filling dropdowns...');
        await performDropdownChecks(answers.dropdowns);
        console.log('RealRun: Filling checkboxes...');
        await performCheckboxChecks(answers.checkboxes);

        // Set form data to be saved with job
        setApplicationFormData(formData);

        // Check buttons
        const submitBtn = findButton('Submit application', currentModal) || findButton('Submit', currentModal);
        console.log('Submit button found:', !!submitBtn);
        if (submitBtn) {
            console.log('Submit button details:', {
                text: submitBtn.innerText.trim(),
                classes: Array.from(submitBtn.classList),
                id: submitBtn.id
            });
        }

        if (submitBtn) {
            console.log('RealRun: Submitting application...');
            await uncheckFollowCompany();
            await addShortDelay();
            console.log('Clicking submit button:', submitBtn);
            submitBtn.click();

            // Wait a bit and then check for success modal
            await addDelay();
            await closePostSubmissionModals();

            // Save job
            console.log('Saving applied job...');
            await saveAppliedJob(jobDetails);

            // Check for Success Modal or Errors
            if (await checkForError()) {
                console.warn('RealRun: Error after submit. Attempting AI Retry...');

                const retryAttempted = await handleValidationRetry(answers, jobDetails);
                if (retryAttempted) {
                    console.log('AI Retry: Re-filled fields. Clicking Submit again...');
                    await addShortDelay();
                    submitBtn.click();
                    await addDelay();

                    if (await checkForError()) {
                        console.error('RealRun: Error persists after submit retry. Aborting.');
                        await discardApplication();
                        return;
                    }
                } else {
                    console.error('RealRun: Error after submit and AI retry not possible.');
                    await discardApplication();
                    return;
                }
            }

            console.log('RealRun: Submitted successfully. Closing success modal...');

            // Close Success Modal
            const dismiss = document.querySelector('.artdeco-modal__dismiss') as HTMLElement;
            if (dismiss) {
                console.log('Closing success modal with dismiss button:', dismiss);
                dismiss.click();
            }

            // Also try to close any post-submission modals that might appear
            await closePostSubmissionModals();

            // Wait for modal to be completely closed before returning
            console.log('Waiting for application form to be completely closed...');
            let closeModalAttempts = 0;
            const maxCloseModalAttempts = 20; // Wait up to 10 seconds

            while (closeModalAttempts < maxCloseModalAttempts) {
                const modal = document.querySelector('.artdeco-modal');
                if (!modal) {
                    console.log('Application form successfully closed.');
                    break;
                }

                // Try to close again if still present
                await closePostSubmissionModals();
                closeModalAttempts++;
                await addVeryShortDelay(); // Wait 500ms between checks
            }

            if (closeModalAttempts >= maxCloseModalAttempts) {
                console.warn('Application form may not be completely closed, but continuing anyway.');
            }

            return;
        }

        const nextBtn = findButton('Next', currentModal) || findButton('Review', currentModal) || findButton('Continue to next step', currentModal);
        console.log('Next/Review button found:', !!nextBtn);
        if (nextBtn) {
            console.log('Next button details:', {
                text: nextBtn.innerText.trim(),
                classes: Array.from(nextBtn.classList),
                id: nextBtn.id
            });
        }

        if (nextBtn) {
            console.log('RealRun: Clicking Next/Review...');
            nextBtn.click();
            await addShortDelay();

            if (await checkForError()) {
                console.warn('RealRun: Error on Next. Attempting AI Retry...');

                const retryAttempted = await handleValidationRetry(answers, jobDetails);
                if (retryAttempted) {
                    console.log('AI Retry: Re-filled fields. Clicking Next/Review again...');
                    await addShortDelay();
                    nextBtn.click();
                    await addShortDelay();

                    if (await checkForError()) {
                        console.error('RealRun: Error persists even after AI retry. Aborting.');
                        await discardApplication();
                        return;
                    }
                } else {
                    console.error('RealRun: Validation error persists and AI retry was not possible. Aborting.');
                    await discardApplication();
                    return;
                }
            }

            // Check for post-submission modal after clicking Next
            await addVeryShortDelay();
            await closePostSubmissionModals();
        } else {
            console.log('No Next/Review button found. Checking other conditions...');

            const header = document.querySelector('.artdeco-modal__header');
            const headerText = header?.textContent?.trim();
            console.log('Modal header text:', headerText);

            if (headerText?.includes('Application sent')) {
                console.log('RealRun: "Application sent" header detected.');
                const dismiss = document.querySelector('.artdeco-modal__dismiss') as HTMLElement;
                if (dismiss) {
                    console.log('Closing "Application sent" modal with dismiss button:', dismiss);
                    dismiss.click();
                }
                await saveAppliedJob(jobDetails);
                // Close any post-submission modals
                await closePostSubmissionModals();
                return;
            }

            if (!document.querySelector('.artdeco-modal')) {
                console.warn('RealRun: Modal closed unexpectedly.');
                // Check for post-submission modal that might have appeared
                await addVeryShortDelay();
                await closePostSubmissionModals();
                return;
            }

            if (attempts > 50) {
                console.error('RealRun: Stuck in loop.');
                // Log final state for debugging
                console.log('Final form state before exiting:');
                logFormState(currentModal);
                break;
            }

            console.log('No actionable buttons found. Waiting before next attempt...');
        }
    }

    console.error('RealRun: Maximum attempts reached.');
}

// Periodic modal checker to close unexpected post-submission modals
async function periodicallyCheckAndCloseModals(stopChecking: () => boolean) {
    while (!stopChecking()) {
        await addShortDelay(); // Check every few seconds
        await closePostSubmissionModals();
    }
}

function logFormState(modal: HTMLElement) {
    // Log form elements
    const inputs = modal.querySelectorAll('input, textarea');
    const selects = modal.querySelectorAll('select');
    const radioGroups = modal.querySelectorAll('fieldset[data-test-form-builder-radio-button-form-component="true"]');

    console.log('  Form elements:', {
        inputs: inputs.length,
        selects: selects.length,
        radioGroups: radioGroups.length
    });

    // Log some details about inputs
    inputs.forEach((input, i) => {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            console.log(`    Input ${i + 1}:`, {
                type: input.type,
                name: input.name,
                value: input.value,
                placeholder: input.placeholder
            });
        }
    });

    // Log some details about selects
    selects.forEach((select, i) => {
        if (select instanceof HTMLSelectElement) {
            console.log(`    Select ${i + 1}:`, {
                name: select.name,
                value: select.value,
                options: Array.from(select.options).map(opt => ({
                    value: opt.value,
                    text: opt.text,
                    selected: opt.selected
                }))
            });
        }
    });

    // Log some details about radio groups
    radioGroups.forEach((group, i) => {
        const radios = group.querySelectorAll('input[type="radio"]');
        const legend = group.querySelector('legend');
        console.log(`    Radio Group ${i + 1}:`, {
            legend: legend?.textContent?.trim(),
            radios: radios.length,
            checked: Array.from(radios).filter(r => (r as HTMLInputElement).checked).length
        });
    });
}

async function waitForModal(): Promise<boolean> {
    console.log('Waiting for modal to appear...');
    let modalRetries = 0;
    // Increased retries from 20 to 50 for better reliability
    while (!document.querySelector('.artdeco-modal') && modalRetries < 50) {
        console.log(`Modal check attempt ${modalRetries + 1}/50`);
        await addVeryShortDelay();
        modalRetries++;
    }

    // Additional check for other modal-like elements that LinkedIn might use
    if (!document.querySelector('.artdeco-modal')) {
        console.log('Checking for alternative modal selectors...');
        const alternativeModals = document.querySelector('[role="dialog"]') ||
            document.querySelector('.modal') ||
            document.querySelector('.popup') ||
            document.querySelector('[data-test-modal]');
        if (alternativeModals) {
            console.log('Found alternative modal selector.');
            return true;
        }
    }

    const found = !!document.querySelector('.artdeco-modal');
    console.log(found ? 'Modal found.' : 'Modal timeout.');

    // If modal not found, log what modal-like elements are present
    if (!found) {
        const modalLikeElements = Array.from(document.querySelectorAll('[role="dialog"], .modal, .popup, [data-test-modal], .artdeco-modal'));
        console.log(`Found ${modalLikeElements.length} modal-like elements:`, modalLikeElements.map((el, i) => ({
            index: i,
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            role: el.getAttribute('role')
        })));
    }

    return found;
}

function findButton(text: string, container: HTMLElement | Document = document): HTMLElement | null {
    const buttons = Array.from(container.querySelectorAll('button'));
    return buttons.find(b => b.innerText.trim().includes(text) && b.offsetParent !== null) || null; // Ensure visible
}

function getFormElements(modal: HTMLElement) {
    // Get form elements
    const inputs = modal.querySelectorAll('input, textarea');
    const selects = modal.querySelectorAll('select');
    const radioGroups = modal.querySelectorAll('fieldset[data-test-form-builder-radio-button-form-component="true"]');

    const formElements: any = {
        inputs: [],
        selects: [],
        radioGroups: [],
        checkboxes: []
    };

    // Process inputs
    inputs.forEach((input) => {
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
            formElements.inputs.push({
                type: input.type,
                name: input.name,
                value: input.value,
                placeholder: input.placeholder
            });
        }
    });

    // Process selects
    selects.forEach((select) => {
        if (select instanceof HTMLSelectElement) {
            formElements.selects.push({
                name: select.name,
                value: select.value,
                options: Array.from(select.options).map(opt => ({
                    value: opt.value,
                    text: opt.text,
                    selected: opt.selected
                }))
            });
        }
    });

    // Process radio groups
    radioGroups.forEach((group) => {
        const radios = group.querySelectorAll('input[type="radio"]');
        const legend = group.querySelector('legend');
        const legendText = legend?.textContent?.trim();

        // Find the selected radio button
        let selectedValue = '';
        const options: any[] = [];

        radios.forEach(radio => {
            if (radio instanceof HTMLInputElement) {
                options.push({
                    value: radio.value,
                    text: radio.nextSibling?.textContent?.trim() || radio.value
                });

                if (radio.checked) {
                    selectedValue = radio.value;
                }
            }
        });

        formElements.radioGroups.push({
            name: legendText || '',
            selectedValue: selectedValue,
            options: options
        });
    });

    // Process checkboxes
    const checkboxContainers = modal.querySelectorAll('.fb-dash-form-element');
    checkboxContainers.forEach(container => {
        const checkbox = container.querySelector('input[type="checkbox"]');
        if (checkbox instanceof HTMLInputElement) {
            const label = container.querySelector('label');
            formElements.checkboxes.push({
                name: label?.innerText.trim() || '',
                checked: checkbox.checked
            });
        }
    });

    return formElements;
}

/**
 * Scans the current modal for validation errors and gathers the corresponding questions.
 */
async function getErrorFieldQuestions(): Promise<QuestionData> {
    const collected: QuestionData = { inputs: [], radios: [], dropdowns: [], checkboxes: [] };
    const modal = document.querySelector('.artdeco-modal') as HTMLElement;
    if (!modal) return collected;

    // Find all error messages
    const errorMessages = modal.querySelectorAll('.artdeco-inline-feedback__message');

    for (const error of Array.from(errorMessages)) {
        const container = error.closest('.fb-dash-form-element') || error.closest('fieldset');
        if (!container) continue;

        // Check for Input/Textarea
        const inputLabel = container.querySelector('.artdeco-text-input--label') || container.querySelector('label');
        const input = (container.querySelector('.artdeco-text-input--input, textarea') || container.querySelector('input[type="text"]')) as HTMLInputElement | HTMLTextAreaElement;
        if (inputLabel && input) {
            const labelText = inputLabel.textContent?.trim() || '';
            if (labelText && !collected.inputs.some(q => q.includes(labelText))) {
                const isTypeahead = input.getAttribute('role') === 'combobox' ||
                    input.closest('.search-vertical-typeahead') !== null ||
                    input.closest('.basic-typeahead') !== null;

                if (isTypeahead) {
                    const defaultFields = await getDefaultFields();
                    let triggerValue = defaultFields.City || "New York";
                    if (labelText.toLowerCase().includes('city') || labelText.toLowerCase().includes('location')) {
                        triggerValue = defaultFields.City || "Kolkata";
                    }
                    const options = await collectTypeaheadOptions(input, triggerValue);
                    if (options.length > 0) {
                        let optionsToPrompt = options.slice(0, 10);
                        if (options.length > 10) optionsToPrompt.push('... (more options)');
                        collected.inputs.push(`question: ${labelText} || options: ${optionsToPrompt.join(', ')}`);
                    } else {
                        collected.inputs.push(labelText);
                    }
                } else {
                    collected.inputs.push(labelText);
                }
            }
            continue;
        }

        // Check for Radio Group
        const fieldset = container.closest('fieldset[data-test-form-builder-radio-button-form-component="true"]');
        if (fieldset) {
            const legend = fieldset.querySelector('legend');
            const questionText = legend?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || legend?.textContent?.trim() || '';
            if (questionText && !collected.radios.includes(questionText)) {
                const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
                let options = radios.map(r => fieldset.querySelector(`label[for="${r.id}"]`)?.textContent?.trim() || r.value);
                if (options.length > 10) options = options.slice(0, 10).concat(['...']);
                collected.radios.push(`question: ${questionText} || options: ${options.join(', ')}`);
            }
            continue;
        }

        // Check for Dropdown
        const select = container.querySelector('select') as HTMLSelectElement;
        if (select) {
            const label = container.querySelector('label');
            const labelText = label?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || label?.textContent?.trim() || '';
            if (labelText && !collected.dropdowns.includes(labelText)) {
                let options = Array.from(select.options).map(o => o.text.trim());
                if (options.length > 10) options = options.slice(0, 10).concat(['...']);
                collected.dropdowns.push(`question: ${labelText} || options: ${options.join(', ')}`);
            }
            continue;
        }

        // Check for Checkbox
        const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkbox) {
            const label = container.querySelector('label');
            const labelText = label?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || label?.textContent?.trim() || '';
            if (labelText && !collected.checkboxes.includes(labelText)) {
                collected.checkboxes.push(labelText);
            }
            continue;
        }
    }

    return collected;
}

/**
 * Handles validation retry by fetching improved answers from AI for problematic fields.
 */
async function handleValidationRetry(currentAnswers: Answers, jobDetails: any): Promise<boolean> {
    console.log('Validation Errors Detected. Starting AI Retry mechanism...');

    const errorQuestions = await getErrorFieldQuestions();
    const hasErrors = errorQuestions.inputs.length > 0 || errorQuestions.radios.length > 0 || errorQuestions.dropdowns.length > 0 || errorQuestions.checkboxes.length > 0;

    if (!hasErrors) {
        console.log('No specific error fields identified, but error message exists.');
        return false;
    }

    console.log('Problematic fields identified:', errorQuestions);

    // Fetch improved answers from AI
    const improvedAnswers = await fetchAIAnswers(errorQuestions, jobDetails);
    if (!improvedAnswers) {
        console.warn('AI failed to provide improved answers for retry.');
        return false;
    }

    console.log('Received improved definitions from AI:', improvedAnswers);

    // Merge improved answers into currentAnswers
    Object.assign(currentAnswers.inputs, improvedAnswers.inputs);
    Object.assign(currentAnswers.radios, improvedAnswers.radios);
    Object.assign(currentAnswers.dropdowns, improvedAnswers.dropdowns);
    Object.assign(currentAnswers.checkboxes, improvedAnswers.checkboxes);

    // Re-fill the fields
    console.log('Re-filling problematic fields with improved answers...');
    await performInputFieldChecks(currentAnswers.inputs);
    await performRadioButtonChecks(currentAnswers.radios);
    await performDropdownChecks(currentAnswers.dropdowns);
    await performCheckboxChecks(currentAnswers.checkboxes);

    return true;
}


async function fillInput(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    // Check if it's a typeahead (City, School, Organization, etc.)
    const isTypeahead = input.getAttribute('role') === 'combobox' ||
        input.closest('.search-vertical-typeahead') !== null ||
        input.closest('.basic-typeahead') !== null ||
        input.classList.contains('basic-input'); // Added common class for LinkedIn typeaheads

    if (isTypeahead) {
        console.log(`Handling Typeahead for ${value}`);
        input.click();
        await addVeryShortDelay();

        // 1. Set value
        setNativeValue(input, value);

        // 2. Wait for dropdown suggestions
        let retries = 0;
        let option: HTMLElement | null = null;
        while (retries < 15) { // Slightly more retries
            await addVeryShortDelay();
            // Robust selectors for typeahead options
            option = document.querySelector('.basic-typeahead__selectable, .search-typeahead-v2__hit, [role="option"]') as HTMLElement;
            if (option) break;
            retries++;
        }

        // 3. Click option if found
        if (option) {
            console.log('Clicking typeahead option:', option.innerText.trim());
            option.click();
            await addVeryShortDelay();
        } else {
            console.log('No typeahead option found, using Enter key.');
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            await addVeryShortDelay();
        }
    } else {
        setNativeValue(input, value);
    }
}

async function gatherCheckboxChecks(): Promise<string[]> {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const questions: string[] = [];
    for (const checkbox of Array.from(checkboxes) as HTMLInputElement[]) {
        if (checkbox.disabled) continue;
        const container = checkbox.closest('.fb-dash-form-element') || checkbox.parentElement;
        const labelText = container?.querySelector('label')?.innerText.trim() || '';
        if (labelText) {
            questions.push(labelText);
        }
    }
    return questions;
}

async function performCheckboxChecks(answers: Record<string, string>) {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of Array.from(checkboxes) as HTMLInputElement[]) {
        if (checkbox.disabled) continue;
        const container = checkbox.closest('.fb-dash-form-element') || checkbox.parentElement;
        const labelText = container?.querySelector('label')?.innerText.trim() || '';
        if (labelText) {
            const answer = findAnswer(answers, labelText);
            if (answer) {
                const shouldBeChecked = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'true' || answer.toLowerCase() === 'checked' || answer.toLowerCase() === 'y';
                if (checkbox.checked !== shouldBeChecked) {
                    checkbox.click();
                    await addVeryShortDelay();
                }
            }
        }
    }
}

async function performInputFieldChecks(answers: Record<string, string>) {
    const containers = document.querySelectorAll('.fb-dash-form-element');
    const defaultFields = await getDefaultFields();

    // Create a combined answers object with defaults
    const combinedAnswers: Record<string, string> = {};

    // Map default fields to common labels
    if (defaultFields.FirstName) combinedAnswers['first name'] = defaultFields.FirstName;
    if (defaultFields.LastName) combinedAnswers['last name'] = defaultFields.LastName;
    if (defaultFields.City) combinedAnswers['city'] = defaultFields.City;
    if (defaultFields.City) combinedAnswers['location'] = defaultFields.City;
    if (defaultFields.PhoneNumber) combinedAnswers['phone'] = defaultFields.PhoneNumber;
    if (defaultFields.PhoneNumber) combinedAnswers['mobile'] = defaultFields.PhoneNumber;
    if (defaultFields.Email) combinedAnswers['email'] = defaultFields.Email;

    for (const container of Array.from(containers)) {
        const label = container.querySelector('.artdeco-text-input--label') || container.querySelector('label');
        const input = (container.querySelector('.artdeco-text-input--input') || container.querySelector('input[type="text"], textarea')) as HTMLInputElement | HTMLTextAreaElement;

        if (label && input) {
            const labelText = label.textContent?.trim() || '';
            let answer = findAnswer(answers, labelText);

            // Fallback to defaults if no AI answer
            if (!answer) {
                answer = findAnswer(combinedAnswers, labelText);
            }

            if (answer && input.value !== answer) {
                await fillInput(input, answer);
                await addVeryShortDelay();
            }
        }
    }
}

async function fillDummyData() {
    console.log('DryRun: Filling dummy data...');

    // 1. Inputs and Textareas
    const containers = document.querySelectorAll('.fb-dash-form-element');
    for (const container of Array.from(containers)) {
        const label = container.querySelector('.artdeco-text-input--label') || container.querySelector('label');
        const input = container.querySelector('input[type="text"], input:not([type]), textarea') as HTMLInputElement;

        if (input && !input.value && !input.readOnly) {
            const labelText = label?.textContent?.trim().toLowerCase() || '';
            let dummyVal = "1";

            if (labelText.includes('name')) dummyVal = "John Doe";
            if (labelText.includes('firstname')) dummyVal = "John";
            if (labelText.includes('lastname')) dummyVal = "Doe";
            if (labelText.includes('email')) dummyVal = "john.doe@example.com";
            if (labelText.includes('phone') || labelText.includes('mobile')) dummyVal = "1234567890";
            if (labelText.includes('city') || labelText.includes('location')) dummyVal = "New York, New York, United States";
            if (labelText.includes('summary') || labelText.includes('description')) dummyVal = "I am a software engineer.";

            // Text areas
            if (input.tagName.toLowerCase() === 'textarea') dummyVal = "I have extensive experience in this field and I am very interested.";

            await fillInput(input, dummyVal);
        }
    }

    // Handle any standalone City typeahead that might not be in fb-dash-form-element
    const cityInput = document.querySelector(".search-vertical-typeahead input") as HTMLInputElement;
    if (cityInput && !cityInput.value) {
        await fillInput(cityInput, "New York, New York, United States");
    }

    // 2. Radios - Select first in each group
    // Broader search for fieldsets containing radios
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fieldset of Array.from(fieldsets)) {
        const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        if (radios.length > 0 && !radios.some(r => r.checked)) {
            console.log(`DryRun: Selecting first radio in fieldset: ${fieldset.querySelector('legend')?.textContent?.trim()}`);
            radios[0].click();
            await addVeryShortDelay();
        }
    }

    // 3. Dropdowns - Select second option (first non-placeholder)
    const selects = document.querySelectorAll('select');
    for (const select of Array.from(selects) as HTMLSelectElement[]) {
        if (select.selectedIndex <= 0 && select.options.length > 1) {
            console.log(`DryRun: Selecting option for dropdown`);
            // Find first option with a non-empty value if possible
            for (let i = 1; i < select.options.length; i++) {
                if (select.options[i].value) {
                    select.value = select.options[i].value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    await addVeryShortDelay();
                    break;
                }
            }
        }
    }

    // 4. Checkboxes - Check all
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of Array.from(checkboxes) as HTMLInputElement[]) {
        if (!cb.checked && !cb.disabled) {
            console.log(`DryRun: Checking checkbox`);
            cb.click();
            await addVeryShortDelay();
        }
    }
}

async function gatherInputFieldChecks(): Promise<string[]> {
    const containers = document.querySelectorAll('.fb-dash-form-element');
    const questions: string[] = [];
    const defaultFields = await getDefaultFields();

    for (const container of Array.from(containers)) {
        const label = container.querySelector('.artdeco-text-input--label') || container.querySelector('label');
        const input = (container.querySelector('.artdeco-text-input--input') || container.querySelector('input[type="text"], textarea')) as HTMLInputElement | HTMLTextAreaElement;

        if (label && input) {
            const labelText = label.textContent?.trim() || '';
            if (!labelText) continue;

            const isTypeahead = input.getAttribute('role') === 'combobox' ||
                input.closest('.search-vertical-typeahead') !== null ||
                input.closest('.basic-typeahead') !== null;

            if (isTypeahead) {
                // Determine what to type to trigger suggestions
                let triggerValue = defaultFields.City || "New York";
                const lowerLabel = labelText.toLowerCase();

                if (lowerLabel.includes('city') || lowerLabel.includes('location')) {
                    triggerValue = defaultFields.City || "Kolkata";
                } else if (lowerLabel.includes('school') || lowerLabel.includes('university')) {
                    triggerValue = "University";
                } else if (lowerLabel.includes('company') || lowerLabel.includes('organization')) {
                    triggerValue = "Google";
                }

                console.log(`DryRun: Triggering typeahead for "${labelText}" with "${triggerValue}"`);
                const options = await collectTypeaheadOptions(input, triggerValue);

                if (options.length > 0) {
                    let optionsToPrompt = options;
                    if (optionsToPrompt.length > 10) {
                        optionsToPrompt = optionsToPrompt.slice(0, 10);
                        optionsToPrompt.push('... (more options)');
                    }
                    questions.push(`question: ${labelText} || options: ${optionsToPrompt.join(', ')}`);
                    continue;
                }
            }

            questions.push(labelText);
        }
    }
    return questions;
}

/**
 * Helper to collect options from a typeahead dropdown
 */
async function collectTypeaheadOptions(input: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<string[]> {
    const originalValue = input.value;
    input.click();
    await addVeryShortDelay();

    // 1. Set value to trigger suggestions
    setNativeValue(input, value);

    // 2. Wait for dropdown suggestions
    let retries = 0;
    let foundOptions: string[] = [];
    while (retries < 15) {
        await addVeryShortDelay();
        // Selectors for LinkedIn dropdown hits
        const hitElements = document.querySelectorAll('.search-typeahead-v2__hit-text, .basic-typeahead-result__text, .basic-typeahead__selectable [role="option"]');

        if (hitElements.length > 0) {
            foundOptions = Array.from(hitElements)
                .map(el => (el as HTMLElement).innerText.trim())
                .filter(text => text.length > 0);

            // Deduplicate
            foundOptions = [...new Set(foundOptions)];

            if (foundOptions.length >= 10) break;
        }
        retries++;
    }

    // Restore original value or clear if it was empty
    if (!originalValue) {
        setNativeValue(input, '');
    } else {
        setNativeValue(input, originalValue);
    }

    return foundOptions;
}

async function getDefaultFields(): Promise<any> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['defaultFields'], (result) => {
            resolve(result.defaultFields || {});
        });
    });
}

async function performRadioButtonChecks(answers: Record<string, string>) {
    const fieldsets = document.querySelectorAll('fieldset');
    for (const fieldset of Array.from(fieldsets)) {
        const legend = fieldset.querySelector('legend');
        const questionText = legend?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || legend?.textContent?.trim() || '';

        if (!questionText) continue;

        const answer = findAnswer(answers, questionText);
        const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];

        if (answer && radios.length > 0) {
            let targetRadio = radios.find(r => r.value === answer);
            if (!targetRadio) {
                targetRadio = radios.find(r => {
                    const label = fieldset.querySelector(`label[for= "${r.id}"]`)?.textContent?.trim() || '';
                    return label.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(label.toLowerCase());
                });
            }
            if (targetRadio) {
                targetRadio.click();
                await addVeryShortDelay();
            }
        }
    }
}

async function gatherRadioButtonChecks(): Promise<string[]> {
    const fieldsets = document.querySelectorAll('fieldset');
    const questions: string[] = [];
    for (const fieldset of Array.from(fieldsets)) {
        const radios = Array.from(fieldset.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        if (radios.length === 0) continue;

        const legend = fieldset.querySelector('legend');
        const questionText = legend?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || legend?.textContent?.trim() || '';
        if (!questionText) continue;

        let options = radios.map(r => fieldset.querySelector(`label[for= "${r.id}"]`)?.textContent?.trim() || r.value);

        // If there are more than 10 options, only send the first 10 plus a placeholder
        if (options.length > 10) {
            options = options.slice(0, 10);
            options.push('... (more options available)');
        }

        questions.push(`question: ${questionText} || options: ${options.join(', ')} `);
    }
    return questions;
}

async function performDropdownChecks(answers: Record<string, string>) {
    const selects = document.querySelectorAll('select');
    for (const select of Array.from(selects) as HTMLSelectElement[]) {
        const container = select.closest('.fb-dash-form-element') || select.parentElement;
        const label = container?.querySelector('label');
        const labelText = label?.querySelector('span[aria-hidden="true"]')?.textContent?.trim() || label?.textContent?.trim() || '';

        if (!labelText) continue;

        const answer = findAnswer(answers, labelText);
        if (answer) {
            const options = Array.from(select.options);
            const targetOption = options.find(o =>
                o.value.toLowerCase() === answer.toLowerCase() ||
                o.text.toLowerCase().includes(answer.toLowerCase()) ||
                answer.toLowerCase().includes(o.text.toLowerCase())
            );
            if (targetOption) {
                select.value = targetOption.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                await addVeryShortDelay();
            }
        }
    }
}

async function gatherDropdownChecks(): Promise<string[]> {
    const selects = document.querySelectorAll('select');
    const questions: string[] = [];
    for (const select of Array.from(selects) as HTMLSelectElement[]) {
        const container = select.closest('.fb-dash-form-element') || select.parentElement;
        const labelText = container?.querySelector('label')?.innerText.trim() || '';
        if (!labelText) continue;

        // Limit options to prevent sending too much data to AI
        let options = Array.from(select.options).map(o => o.text.trim());

        // If there are more than 10 options, only send the first 10 plus a placeholder
        if (options.length > 10) {
            options = options.slice(0, 10);
            options.push('... (more options available)');
        }

        questions.push(`question: ${labelText} || options: ${options.join(', ')} `);
    }
    return questions;
}

function findAnswer(answers: Record<string, string>, question: string): string | null {
    if (!answers || !question) return null;
    const qLower = question.toLowerCase();
    if (answers[question]) return answers[question];
    for (const [key, val] of Object.entries(answers)) {
        if (qLower.includes(key.toLowerCase()) || key.toLowerCase().includes(qLower)) {
            return val;
        }
    }
    return null;
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const lastValue = element.value;
    element.value = value;
    const event = new Event('input', { bubbles: true });
    const tracker = (element as any)._valueTracker;
    if (tracker) tracker.setValue(lastValue);
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

// Global variable to store form data during application process
let applicationFormData: any = null;

// Function to set form data during application
export function setApplicationFormData(formData: any) {
    applicationFormData = formData;
}

export async function saveAppliedJob(jobDetails: any) {
    console.log('Saving applied job with form data:', jobDetails);
    const now = new Date();
    const isoDate = now.toISOString();
    const dateKey = isoDate.split('T')[0];

    const result = await chrome.storage.local.get(['appliedJobs']);
    const appliedJobs = result.appliedJobs || {};

    if (!appliedJobs[dateKey]) appliedJobs[dateKey] = [];

    // Check for duplicates in the current day's list (optimistic)
    const exists = appliedJobs[dateKey].some((j: any) =>
        j.jobTitle === jobDetails?.jobTitle &&
        j.company === jobDetails?.company
    );

    if (!exists && jobDetails) {
        // Include form data with job details
        const jobWithFormData = {
            ...jobDetails,
            appliedDate: isoDate, // Full timestamp for accurate sorting and display
            applicationFormData: applicationFormData || null
        };

        appliedJobs[dateKey].push(jobWithFormData);
        await chrome.storage.local.set({ appliedJobs });

        // Also update a global count if needed
        chrome.runtime.sendMessage({ action: 'updateJobCount' });

        console.log(`Successfully saved job: ${jobDetails.jobTitle} at ${jobDetails.company}`);

        // Clear form data after saving
        applicationFormData = null;
    } else if (exists) {
        console.log(`Job already marked as applied today: ${jobDetails.jobTitle} at ${jobDetails.company}`);
    }
}

export async function performSafetyReminderCheck() {
    const modal = document.querySelector('.artdeco-modal');
    if (modal) {
        const header = modal.querySelector('.artdeco-modal__header');
        if (header && header.textContent?.includes('Job search safety reminder')) {
            const dismiss = modal.querySelector('.artdeco-modal__dismiss') as HTMLElement;
            if (dismiss) dismiss.click();
        }
    }
}

// --- Helper Functions ---

function isOnJobDetailsPage(jobId?: string, jobTitle?: string, company?: string): boolean {
    console.log('Checking if we are on job details page...');

    // Log current URL
    console.log('Current URL:', window.location.href);

    // Even if we don't have perfect elements, check if we're on a job view URL
    const isJobViewUrl = window.location.pathname.includes('/jobs/view/');
    console.log('Is job view URL:', isJobViewUrl);

    // If we're on a job view URL, that's usually good enough
    if (isJobViewUrl) {
        console.log('On job view URL, considering this sufficient');
        return true;
    }

    // If we have a job ID, check if it matches the current URL
    if (jobId) {
        const urlContainsJobId = window.location.href.includes(jobId);
        console.log(`URL contains job ID ${jobId}: `, urlContainsJobId);
        if (urlContainsJobId) {
            console.log('URL contains job ID, considering this sufficient');
            return true;
        }

        // Try alternate methods to find job ID in DOM
        const jobLink = document.querySelector(`a[href *= "${jobId}"]`);
        console.log(`Job ID ${jobId} found in links: `, !!jobLink);
        if (jobLink) {
            console.log('Job ID found in DOM links');
            return true;
        }
    }

    // Check if we're on a job details page by looking for key elements
    const jobDetailsContainer = document.querySelector('.job-details-jobs-unified-top-card');
    const jobTitleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title');
    const companyNameElement = document.querySelector('.job-details-jobs-unified-top-card__company-name');

    console.log('Key elements found:', {
        jobDetailsContainer: !!jobDetailsContainer,
        jobTitleElement: !!jobTitleElement,
        companyNameElement: !!companyNameElement
    });

    // Check if key elements exist
    if (!jobDetailsContainer || !jobTitleElement || !companyNameElement) {
        console.log('Key job details elements not found on current page');
        return false;
    }

    // If we have job title and company, check if they match
    if (jobTitle && company) {
        const currentJobTitle = jobTitleElement.textContent?.trim();
        const currentCompany = companyNameElement.textContent?.trim();

        console.log('Comparing job details:', {
            expectedTitle: jobTitle,
            currentTitle: currentJobTitle,
            expectedCompany: company,
            currentCompany: currentCompany
        });

        // Sometimes the title/company might be slightly different, so check if at least one matches
        if (currentJobTitle?.includes(jobTitle) || currentCompany?.includes(company)) {
            console.log('Partial match found for job title or company');
            return true;
        }

        if (!currentJobTitle?.includes(jobTitle) || !currentCompany?.includes(company)) {
            console.log('Job title or company mismatch');
            console.log(`Expected: ${jobTitle} at ${company} `);
            console.log(`Found: ${currentJobTitle} at ${currentCompany} `);
            return false;
        }
    }

    // If we have at least the basic elements, consider it valid
    console.log('Confirmed on job details page based on DOM elements');
    return true;
}

async function reselectJob(jobId?: string, jobTitle?: string, company?: string): Promise<boolean> {
    console.log(`Attempting to re-select job: ${jobTitle} at ${company} (ID: ${jobId})`);

    // Log current page state
    console.log('Current page state during reselection:');
    logPageState();

    // First, try to find the job by ID if we have it
    if (jobId) {
        console.log(`Searching for job by ID: ${jobId}`);
        // Try multiple selectors for job links with this ID
        const jobSelectors = [
            `a[href*="${jobId}"]`,
            `[data-job-id="${jobId}"]`,
            `a[href*="/jobs/view/${jobId}/"]`
        ];

        for (const selector of jobSelectors) {
            console.log(`Trying selector: ${selector}`);
            const jobLink = document.querySelector(selector) as HTMLAnchorElement;
            if (jobLink) {
                console.log('Found job by ID, clicking link...');
                console.log('Job link element:', jobLink);
                jobLink.click();
                await addShortDelay();
                return true;
            }
        }
        console.log('Job link with ID not found using any selector');
    }

    // If that fails, try to find by title and company in job listings
    console.log('Searching for job by title and company in job cards...');

    // Try multiple selectors for job cards
    const jobCardSelectors = [
        'a.job-card-list__title',
        '.job-card-container a.job-link',
        '.jobs-search-results-list li a',
        'a[href*="/jobs/view/"]'
    ];

    let jobCards: Element[] = [];
    for (const selector of jobCardSelectors) {
        const cards = Array.from(document.querySelectorAll(selector));
        console.log(`Found ${cards.length} elements with selector: ${selector}`);
        if (cards.length > 0) {
            jobCards = cards;
            break;
        }
    }

    if (jobCards.length === 0) {
        // Last resort: try all anchor tags that might be job links
        jobCards = Array.from(document.querySelectorAll('a[href*="/jobs/view/"]'));
        console.log(`Last resort: Found ${jobCards.length} potential job links`);
    }

    console.log(`Processing ${jobCards.length} job card elements`);

    for (const card of jobCards) {
        const titleElement = card as HTMLAnchorElement;
        let title = '';

        // Different ways to get the title depending on the element structure
        if (titleElement.textContent) {
            title = titleElement.textContent.trim();
        } else if (titleElement.querySelector('*')) {
            title = titleElement.querySelector('*')?.textContent?.trim() || '';
        }

        // Find the company name associated with this job card
        let cardCompany = '';
        const jobCardContainer = card.closest('.job-card-list-item, .job-card-container, li');
        if (jobCardContainer) {
            const companyElement = jobCardContainer.querySelector('.job-card-container__company-name, .job-card-list-item__company-name, .t-black--light');
            if (companyElement) {
                cardCompany = companyElement.textContent?.trim() || '';
            }
        }

        console.log('Checking job card:', { title, cardCompany });

        // If we have a job title, try to match it
        if (jobTitle && title && title.includes(jobTitle)) {
            // If we also have a company name, make sure it matches or is not required
            if (!company || (cardCompany && cardCompany.includes(company))) {
                console.log('Found matching job card, clicking...');
                console.log('Job card element:', titleElement);
                titleElement.click();
                await addShortDelay();
                return true;
            }
        }

        // If we only have a company name, try to match it
        if (!jobTitle && company && cardCompany && cardCompany.includes(company)) {
            console.log('Found matching job by company, clicking...');
            console.log('Job card element:', titleElement);
            titleElement.click();
            await addShortDelay();
            return true;
        }
    }

    // If we still haven't found the job, try to go back to the search results page
    // and then find the job
    console.log('Still could not find job. Checking if we are on search results page...');
    const isSearchResultsPage = !!document.querySelector('.jobs-search-results-list');
    if (!isSearchResultsPage) {
        console.log('Not on search results page. Looking for a way to get there...');

        // Try to find a "back to search" or similar link
        const backLinks = Array.from(document.querySelectorAll('a')).filter(a => {
            const text = a.textContent?.toLowerCase() || '';
            return text.includes('search') || text.includes('back') || text.includes('results');
        });

        if (backLinks.length > 0) {
            console.log(`Found ${backLinks.length} potential back/search links. Trying first one.`);
            const backLink = backLinks[0] as HTMLAnchorElement;
            console.log('Back link:', backLink);
            backLink.click();
            await addShortDelay();

            // Now try to find the job again
            console.log('After clicking back link, trying to find job again...');
            await addShortDelay();

            // Try the job card search again
            const retryCards = Array.from(document.querySelectorAll('a.job-card-list__title'));
            for (const card of retryCards) {
                const titleElement = card as HTMLAnchorElement;
                const title = titleElement.textContent?.trim() || '';

                if (jobTitle && title.includes(jobTitle)) {
                    console.log('Found job on retry after going back to search results');
                    titleElement.click();
                    await addShortDelay();
                    return true;
                }
            }
        }
    }

    console.error('Could not find job to re-select');
    return false;
}

function logPageState() {
    // Log current URL
    console.log('  Current URL:', window.location.href);

    // Log key page elements
    const isSearchResultsPage = !!document.querySelector('.jobs-search-results-list');
    const isJobDetailsPage = !!document.querySelector('.job-details-jobs-unified-top-card');
    const isModalOpen = !!document.querySelector('.artdeco-modal');
    const jobTitleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title');
    const companyNameElement = document.querySelector('.job-details-jobs-unified-top-card__company-name');

    console.log('  Page state:', {
        isSearchResultsPage,
        isJobDetailsPage,
        isModalOpen,
        jobTitle: jobTitleElement ? jobTitleElement.textContent?.trim() : null,
        company: companyNameElement ? companyNameElement.textContent?.trim() : null
    });

    // Log available buttons
    const allButtons = Array.from(document.querySelectorAll('button'));
    const easyApplyButtons = allButtons.filter(b =>
        b instanceof HTMLElement && b.innerText.trim().includes('Easy Apply')
    );
    console.log(`  Found ${allButtons.length} total buttons, ${easyApplyButtons.length} Easy Apply buttons`);

    // Log first few Easy Apply buttons for inspection
    easyApplyButtons.slice(0, 3).forEach((btn, i) => {
        console.log(`    Easy Apply Button ${i + 1}:`, {
            text: btn.innerText.trim(),
            classes: Array.from(btn.classList),
            id: btn.id,
            visible: btn.offsetParent !== null,
            disabled: btn.hasAttribute('disabled')
        });
    });
}

// New function to close post-submission modals
async function closePostSubmissionModals() {
    console.log('Checking for and closing post-submission modals...');

    // Wait a bit for any modals to appear
    await addShortDelay();

    // Check all modals on the page
    const modals = Array.from(document.querySelectorAll('.artdeco-modal'));

    for (const modal of modals) {
        // Log modal for debugging
        const headerText = modal.querySelector('.artdeco-modal__header')?.textContent?.trim() || "";
        const bodyText = modal.textContent?.trim() || "";

        console.log(`Evaluating modal with header: "${headerText}"`);

        // IMPORTANT: We MUST NOT close the main application form modal.
        // It usually has "Apply to" or the job title in its header, or contains form elements.
        if (modal.querySelector('.jobs-easy-apply-modal, .fb-dash-form-element')) {
            console.log('Skipping main application form modal.');
            continue;
        }

        // Also skip modals that look like the main apply form based on content
        if (headerText.toLowerCase().includes('apply to') || bodyText.toLowerCase().includes('contact info')) {
            console.log('Skipping modal that appears to be part of the application form.');
            continue;
        }

        // Target specific post-submission or annoying modals
        const isPostSubmission =
            headerText.toLowerCase().includes('ready for your next') ||
            headerText.toLowerCase().includes('don\'t miss out') ||
            headerText.toLowerCase().includes('saved') ||
            headerText.toLowerCase().includes('follow') ||
            bodyText.toLowerCase().includes('notified about similar jobs') ||
            bodyText.toLowerCase().includes('work from home') ||
            bodyText.toLowerCase().includes('get the app');

        if (isPostSubmission) {
            console.log('Found post-submission modal, attempting to close...');

            // Look for "Not now" button
            const notNowButton = Array.from(modal.querySelectorAll('button')).find(button =>
                button.textContent?.trim().toLowerCase().includes('not now')
            );

            if (notNowButton) {
                console.log('Found "Not now" button, clicking...');
                (notNowButton as HTMLElement).click();
                await addVeryShortDelay();
                continue;
            }

            // If no "Not now" button, look for dismiss (X)
            const dismissButton = modal.querySelector('.artdeco-modal__dismiss') as HTMLElement;
            if (dismissButton) {
                console.log('Found dismiss button, clicking...');
                dismissButton.click();
                await addVeryShortDelay();
                continue;
            }

            // Last resort: Cancel/Close
            const cancelButton = Array.from(modal.querySelectorAll('button')).find(button =>
                button.textContent?.trim().toLowerCase().includes('cancel') ||
                button.textContent?.trim().toLowerCase().includes('close')
            );

            if (cancelButton) {
                console.log('Found cancel/close button, clicking...');
                (cancelButton as HTMLElement).click();
                await addVeryShortDelay();
            }
        }
    }
}

export async function validateAndCloseConfirmationModal() {
    const modals = Array.from(document.querySelectorAll('.artdeco-modal'));
    for (const modal of modals) {
        const header = modal.querySelector('.artdeco-modal__header');
        if (header && header.textContent?.includes('Save this application?')) {
            console.log('Closing "Save this application?" modal...');
            const dismiss = modal.querySelector('.artdeco-modal__dismiss') as HTMLElement;
            if (dismiss) dismiss.click();
            await addShortDelay();
        }
    }
}
