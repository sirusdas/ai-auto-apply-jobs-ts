// Application functionality for the auto-apply extension

import { addDelay, addShortDelay, defaultFields } from '../core';
import { handleScriptTermination } from '../jobProcessor';

// Function to handle safety reminder check
export async function performSafetyReminderCheck() {
    try {
        // Look for safety reminder modal
        const safetyReminderModal = document.querySelector('.artdeco-modal--pristine.artdeco-modal--viewport-centered');
        if (safetyReminderModal) {
            console.log('Safety reminder modal detected');
            
            // Look for the "Got it" or similar confirmation button
            const confirmButton = safetyReminderModal.querySelector('button.artdeco-button--primary, button[data-test-modal-close-btn]') as HTMLElement | null;
            if (confirmButton) {
                console.log('Clicking safety reminder confirmation button');
                confirmButton.click();
                await addShortDelay();
            }
        }
    } catch (error) {
        console.error('Error handling safety reminder:', error);
    }
}

// Function to validate and close confirmation modal
export async function validateAndCloseConfirmationModal() {
    try {
        // Look for confirmation modal
        const confirmationModal = document.querySelector('.artdeco-modal--pristine.artdeco-modal--viewport-centered');
        if (confirmationModal) {
            console.log('Confirmation modal detected');
            
            // Look for the close button
            const closeButton = confirmationModal.querySelector('button.artdeco-modal__dismiss') as HTMLElement | null;
            if (closeButton) {
                console.log('Closing confirmation modal');
                closeButton.click();
                await addShortDelay();
            }
        }
    } catch (error) {
        console.error('Error closing confirmation modal:', error);
    }
}

// Function to check for errors during application process
export async function checkForError() {
    try {
        // Look for error messages or alerts
        const errorElements = document.querySelectorAll('.artdeco-alert, .artdeco-toast, .error-message, .alert');
        if (errorElements.length > 0) {
            console.log('Error elements detected:', errorElements.length);
            
            // Try to close error messages
            errorElements.forEach(element => {
                const closeButton = element.querySelector('button.artdeco-alert__dismiss, button.artdeco-toast__dismiss') as HTMLElement | null;
                if (closeButton) {
                    closeButton.click();
                }
            });
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking for errors:', error);
        return false;
    }
}

// Function to terminate job model in case of errors
export async function terminateJobModel() {
    try {
        console.log('Terminating job model...');
        
        // Try multiple methods to close the application modal
        const selectors = [
            'button.artdeco-modal__dismiss',
            '.artdeco-modal__dismiss',
            'button[data-test-modal-close-btn]',
            'button[aria-label="Dismiss"]'
        ];
        
        for (const selector of selectors) {
            const dismissButton = document.querySelector(selector) as HTMLElement | null;
            if (dismissButton) {
                console.log('Clicking dismiss button with selector:', selector);
                dismissButton.click();
                await addShortDelay();
                
                // Check if modal is still open
                const modal = document.querySelector('.artdeco-modal');
                if (!modal) {
                    console.log('Modal successfully closed');
                    break;
                }
            }
        }
        
        // Try to click the discard application button if it exists
        const discardButtons = document.querySelectorAll('button.artdeco-button--secondary, button[data-test-dialog-secondary-btn]');
        discardButtons.forEach(button => {
            const buttonText = button.textContent?.toLowerCase();
            if (buttonText?.includes('discard') || buttonText?.includes('cancel')) {
                console.log('Clicking discard button');
                (button as HTMLElement).click();
                addShortDelay();
            }
        });
        
        console.log('Job model termination completed');
    } catch (error) {
        console.error('Error terminating job model:', error);
    }
}

// Function to uncheck follow company checkbox
export async function uncheckFollowCompany() {
    try {
        // Try multiple selectors for the follow company checkbox
        const selectors = [
            '#follow-company-checkbox',
            'input[type="checkbox"][id*="follow"]',
            '.jobs-follow-company-checkbox input[type="checkbox"]',
            'input[type="checkbox"][name*="follow"]'
        ];

        let followCheckbox: HTMLInputElement | null = null;

        for (const selector of selectors) {
            followCheckbox = document.querySelector(selector) as HTMLInputElement | null;
            if (followCheckbox) break;
        }

        if (followCheckbox?.checked) {
            console.log('Unchecking follow company checkbox');
            followCheckbox.checked = false;
            followCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            await addShortDelay();
        } else if (followCheckbox) {
            console.log('Follow company checkbox already unchecked');
        } else {
            console.log('Follow company checkbox not found');
        }
    } catch (error) {
        console.error('Error unchecking follow company:', error);
    }
}

// Function to perform input field checks
export async function performInputFieldChecks(prefillableData: any = {}) {
    // Initialize with empty array if chrome.runtime.sendMessage fails
    let result: any[] = [];

    try {
        result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getInputFieldConfig' }, (response) => {
                // Handle case where response is undefined
                resolve(response || []);
            });
        });
    } catch (error) {
        console.error('Error getting input field config:', error);
        result = [];
    }

    const questionContainers = document.querySelectorAll('.fb-dash-form-element');

    for (const container of Array.from(questionContainers)) {
        const label = container.querySelector('.artdeco-text-input--label');
        const inputField = container.querySelector('.artdeco-text-input--input') as HTMLInputElement | null;

        let labelText: string = '';
        if (label) {
            labelText = label.textContent?.trim() || '';
            const foundConfig = result.find((config: any) => config.placeholderIncludes === labelText);

            if (foundConfig) {
                if (inputField) {
                    inputField.value = prefillableData[labelText] || foundConfig.defaultValue;

                    ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
                        inputField.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                    });

                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                }
                foundConfig.count++;
            } else {
                if (inputField) {
                    // Use appropriate default value based on field label
                    let defaultValue = defaultFields.YearsOfExperience; // default fallback
                    
                    if (labelText.toLowerCase().includes('phone') || labelText.toLowerCase().includes('mobile')) {
                        defaultValue = defaultFields.PhoneNumber;
                    } else if (labelText.toLowerCase().includes('email')) {
                        defaultValue = defaultFields.Email;
                    } else if (labelText.toLowerCase().includes('first') || labelText.toLowerCase().includes('given')) {
                        defaultValue = defaultFields.FirstName;
                    } else if (labelText.toLowerCase().includes('last') || labelText.toLowerCase().includes('family')) {
                        defaultValue = defaultFields.LastName;
                    } else if (labelText.toLowerCase().includes('city') || labelText.toLowerCase().includes('location')) {
                        defaultValue = defaultFields.City;
                    }

                    inputField.value = prefillableData[labelText] || defaultValue;

                    ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
                        inputField.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                    });

                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const newConfig = {
                    placeholderIncludes: labelText,
                    defaultValue: prefillableData[labelText] || defaultFields.YearsOfExperience,
                    count: 1
                };
                result.push(newConfig);

                // Update the inputFieldConfigs in storage
                try {
                    chrome.storage.local.set({ 'inputFieldConfigs': result }, () => { });
                } catch (error) {
                    console.error('Error saving input field config:', error);
                }
            }
        }
    }

    // Final save of updated storage
    try {
        chrome.storage.local.set({ 'getInputFieldConfig': result }, () => { });
    } catch (error) {
        console.error('Error saving input field config to storage:', error);
    }
}

// Function to perform special input field city check
export async function performInputFieldCityCheck() {
    try {
        const cityFields = document.querySelectorAll('input[id*="city"], input[aria-labelledby*="city"]');
        
        for (const cityField of Array.from(cityFields)) {
            const input = cityField as HTMLInputElement;
            if (!input.value) {
                input.value = defaultFields.City;
                ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
                    input.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                });
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    } catch (error) {
        console.error('Error in city field check:', error);
    }
}

// Function to perform checkbox field city check
export async function performCheckBoxFieldCityCheck() {
    try {
        // Look for checkbox fields related to city or location
        const checkboxFieldsets = document.querySelectorAll('fieldset[data-test-checkbox-form-component="true"]');
        
        checkboxFieldsets.forEach(fieldset => {
            const firstCheckbox = fieldset.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (firstCheckbox) {
                firstCheckbox.checked = true;
                firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Usually we don't want to automatically check these, but we should log them
        if (checkboxFieldsets.length > 0) {
            console.log('Found city-related checkbox fields:', checkboxFieldsets.length);
        }
    } catch (error) {
        console.error('Error in checkbox field city check:', error);
    }
}

// Function to handle mandatory checkboxes
export async function handleMandatoryCheckboxes() {
    try {
        const mandatoryCheckboxes = document.querySelectorAll('input[type="checkbox"][aria-required="true"]');
        mandatoryCheckboxes.forEach((checkbox) => {
            const input = checkbox as HTMLInputElement;
            if (!input.checked) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    } catch (error) {
        console.error('Error handling mandatory checkboxes:', error);
    }
}

// Function to handle all checkboxes during data collection phase
export async function handleAllCheckboxesForDataCollection() {
    try {
        console.log('Starting handleAllCheckboxesForDataCollection');
        
        // Find all unchecked checkboxes
        const allCheckboxes = document.querySelectorAll('input[type="checkbox"]:not(:checked)') as NodeListOf<HTMLInputElement>;
        console.log('Found unchecked checkboxes:', allCheckboxes.length);
        
        // Log details about each checkbox
        allCheckboxes.forEach((checkbox, index) => {
            console.log(`Checkbox ${index}:`, {
                id: checkbox.id,
                name: checkbox.name,
                className: checkbox.className,
                required: checkbox.required,
                ariaRequired: checkbox.getAttribute('aria-required'),
                checked: checkbox.checked,
                parentElement: checkbox.parentElement?.tagName,
                closestFieldset: checkbox.closest('fieldset')?.getAttribute('data-test-checkbox-form-component'),
                closestFormElement: checkbox.closest('.fb-dash-form-element')?.className
            });
        });
        
        // Check all checkboxes during data collection phase
        for (const checkbox of Array.from(allCheckboxes)) {
            // Check if checkbox is in a fieldset marked as a checkbox form component
            const fieldset = checkbox.closest('fieldset[data-test-checkbox-form-component="true"]');
            if (fieldset) {
                console.log('Processing checkbox in fieldset');
                // For fieldsets, we want to be more specific about which checkboxes to check
                // Check if this is a required checkbox based on the fieldset structure
                const requiredTitle = fieldset.querySelector('.fb-dash-form-element__label-title--is-required');
                const requiredIndicator = fieldset.querySelector('[data-test-checkbox-form-required="true"]');
                
                console.log('Fieldset details:', {
                    hasRequiredTitle: !!requiredTitle,
                    hasRequiredIndicator: !!requiredIndicator,
                    fieldsetId: fieldset.id,
                    fieldsetAttributes: Array.from(fieldset.attributes).map(attr => `${attr.name}=${attr.value}`)
                });
                
                // Always check checkboxes in fieldsets during data collection
                console.log('Checking checkbox in fieldset during data collection:', checkbox.id || 'Unnamed checkbox');
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            } else {
                // For standalone checkboxes, check them all during data collection
                console.log('Checking standalone checkbox during data collection:', checkbox.id || 'Unnamed checkbox');
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            }
        }
        
        // Log how many checkboxes were processed
        if (allCheckboxes.length > 0) {
            console.log('Checked all checkboxes for data collection:', allCheckboxes.length);
        } else {
            console.log('No unchecked checkboxes found');
        }
        
        // After processing, let's check if there are any remaining unchecked checkboxes
        const remainingUnchecked = document.querySelectorAll('input[type="checkbox"]:not(:checked)') as NodeListOf<HTMLInputElement>;
        console.log('Remaining unchecked checkboxes after processing:', remainingUnchecked.length);
        remainingUnchecked.forEach((checkbox, index) => {
            console.log(`Remaining checkbox ${index}:`, {
                id: checkbox.id,
                name: checkbox.name,
                checked: checkbox.checked
            });
        });
    } catch (error) {
        console.error('Error checking all checkboxes for data collection:', error);
    }
}

// Function to perform radio button checks
export async function performRadioButtonChecks(prefillableData: any = {}) {
    let storedRadios: any[] = [];

    try {
        storedRadios = await new Promise((resolve) => {
            chrome.storage.local.get('radioButtons', (result) => {
                resolve(result.radioButtons || []);
            });
        });
    } catch (error) {
        console.error('Error getting stored radios:', error);
        storedRadios = [];
    }

    const radioGroups = document.querySelectorAll('.fb-dash-form-element');

    for (const group of Array.from(radioGroups)) {
        const legend = group.querySelector('legend');
        if (legend) {
            const legendText = legend.textContent?.trim() || '';
            const radios = group.querySelectorAll('input[type="radio"]');

            if (radios.length > 0) {
                // Check if we have a stored value for this radio group
                const storedRadio = storedRadios.find((r: any) => r.label === legendText);

                if (storedRadio) {
                    // Select the stored option
                    const radioToSelect = Array.from(radios).find((r: any) =>
                        r.closest('label')?.textContent?.trim() === storedRadio.selectedOption);
                    if (radioToSelect) {
                        console.log(`Selecting stored radio option for "${legendText}": ${storedRadio.selectedOption}`);
                        (radioToSelect as HTMLInputElement).click();
                        await addShortDelay();
                    }
                } else if (prefillableData[legendText]) {
                    // Use prefillable data if available
                    const radioToSelect = Array.from(radios).find((r: any) =>
                        r.closest('label')?.textContent?.trim() === prefillableData[legendText]);
                    if (radioToSelect) {
                        console.log(`Selecting prefillable radio option for "${legendText}": ${prefillableData[legendText]}`);
                        (radioToSelect as HTMLInputElement).click();
                        await addShortDelay();
                    }
                } else {
                    // Select the first option by default
                    const firstRadio = radios[0] as HTMLInputElement;
                    console.log(`Selecting first radio option for "${legendText}": ${firstRadio.closest('label')?.textContent?.trim()}`);
                    firstRadio.click();
                    await addShortDelay();

                    // Save this selection
                    const selectedOption = firstRadio.closest('label')?.textContent?.trim() || '';
                    storedRadios.push({ label: legendText, selectedOption });
                    try {
                        chrome.storage.local.set({ radioButtons: storedRadios });
                    } catch (error) {
                        console.error('Error saving radio selection:', error);
                    }
                }
            }
        }
    }
}

// Function to perform dropdown checks
export async function performDropdownChecks(prefillableData: any = {}) {
    let storedDropdowns: any[] = [];

    try {
        storedDropdowns = await new Promise((resolve) => {
            chrome.storage.local.get('dropdowns', (result) => {
                resolve(result.dropdowns || []);
            });
        });
    } catch (error) {
        console.error('Error getting stored dropdowns:', error);
        storedDropdowns = [];
    }

    const dropdowns = document.querySelectorAll('select');
    for (const dropdown of Array.from(dropdowns)) {
        const parentElement = dropdown.closest('.fb-dash-form-element');
        if (!parentElement) continue;

        const labelElement = parentElement.querySelector('label');
        if (!labelElement) continue;

        const labelText = labelElement.textContent?.trim() || '';

        // Check if we have a stored value for this dropdown
        const storedDropdown = storedDropdowns.find((d: any) => d.label === labelText);

        if (storedDropdown) {
            // Select the stored option
            const optionToSelect = Array.from(dropdown.options).find(
                option => option.textContent?.trim() === storedDropdown.selectedOption);
            if (optionToSelect) {
                console.log(`Selecting stored dropdown option for "${labelText}": ${storedDropdown.selectedOption}`);
                dropdown.value = optionToSelect.value;
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            }
        } else if (prefillableData[labelText]) {
            // Use prefillable data if available
            const optionToSelect = Array.from(dropdown.options).find(
                option => option.textContent?.trim() === prefillableData[labelText]);
            if (optionToSelect) {
                console.log(`Selecting prefillable dropdown option for "${labelText}": ${prefillableData[labelText]}`);
                dropdown.value = optionToSelect.value;
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            }
        } else {
            // Select the second option if available (first might be a placeholder)
            const secondOption = dropdown.options[1];
            if (secondOption && dropdown.selectedIndex < 1) {
                console.log(`Selecting second dropdown option for "${labelText}": ${secondOption.textContent?.trim()}`);
                secondOption.selected = true;
                dropdown.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();

                // Save this selection
                const selectedOption = secondOption.textContent?.trim() || '';
                storedDropdowns.push({ label: labelText, selectedOption });
                try {
                    chrome.storage.local.set({ dropdowns: storedDropdowns });
                } catch (error) {
                    console.error('Error saving dropdown selection:', error);
                }
            }
        }
    }
}

// Function to run validations
export async function runValidations(prefillableData: any = {}) {
    console.log('Application runValidations: Starting with prefillableData:', prefillableData);
    
    // Handle safety reminders first
    await performSafetyReminderCheck();
    
    // Perform various field checks
    await performInputFieldChecks(prefillableData);
    await performInputFieldCityCheck();
    await performCheckBoxFieldCityCheck();
    await handleMandatoryCheckboxes(); // Handle mandatory checkboxes
    await handleAllCheckboxesForDataCollection(); // Check all checkboxes during data collection phase
    await performRadioButtonChecks(prefillableData);
    await performDropdownChecks(prefillableData);
    
    // Check for errors
    await checkForError();
    
    console.log('Application runValidations: Completed');
}

// Function to record job application
export async function recordJobApplication(jobTitle: string, companyName: string, jobUrl: string) {
    try {
        // Create job application record
        const jobRecord = {
            jobTitle,
            companyName,
            jobUrl,
            appliedDate: new Date().toISOString(),
            status: 'applied'
        };

        // Get existing applied jobs
        const result = await new Promise<any>((resolve) => {
            chrome.storage.local.get(['appliedJobs'], (result) => {
                resolve(result.appliedJobs || []);
            });
        });

        const appliedJobs = result;

        // Add to applied jobs list
        appliedJobs.push(jobRecord);

        // Save to storage
        await new Promise((resolve) => {
            chrome.storage.local.set({ appliedJobs }, () => {
                console.log('Job application recorded:', jobRecord);
                resolve(null);
            });
        });
    } catch (error) {
        console.error('Error recording job application:', error);
    }
}

// Function to close application sent modal
async function closeApplicationSentModal() {
    const modal = document.querySelector('.artdeco-modal');
    if (modal?.textContent?.includes('Application sent') && modal.textContent.includes('Your application was sent to')) {
        modal.querySelector<HTMLElement>('.artdeco-modal__dismiss')?.click();
    }
}

// Function to run apply model
export async function runApplyModel(
    fetchingFieldValues = true,
    overallInputQuestions: string[] = [],
    overallRadioButtonQuestions: string[] = [],
    overallDropdownQuestions: string[] = [],
    prefillableData: any = {}
) {
    if (Object.keys(prefillableData).length > 0) {
        fetchingFieldValues = false;
    }

    try {
        await performSafetyReminderCheck();
        await addDelay();

        const continueBtn = Array.from(document.querySelectorAll('button.jobs-apply-button.artdeco-button--primary'))
            .find(b => b.querySelector('span.artdeco-button__text')?.textContent?.trim() === 'Continue applying') as HTMLButtonElement | undefined;
            
        if (continueBtn) {
            continueBtn.click();
            return runApplyModel(fetchingFieldValues, overallInputQuestions, overallRadioButtonQuestions, overallDropdownQuestions, prefillableData);
        }

        const nextBtn = document.querySelector<HTMLButtonElement>('button[data-easy-apply-next-button]');
        const reviewBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Review your application"]');
        const submitBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Submit application"]');

        if (submitBtn) {
            await addShortDelay();
            await uncheckFollowCompany();
            await addShortDelay();
            submitBtn.click();
            await addDelay();
            document.querySelector<HTMLElement>('.artdeco-modal__dismiss')?.click();
            return;
        }

        if (nextBtn || reviewBtn) {
            if (fetchingFieldValues) {
                const [i, r, d] = await navigateThroughEasyApply();
                overallInputQuestions.push(...i);
                overallRadioButtonQuestions.push(...r);
                overallDropdownQuestions.push(...d);
            }

            if (reviewBtn && fetchingFieldValues && Object.keys(prefillableData).length === 0) {
                await terminateJobModel();
                const questions = [...overallInputQuestions, ...overallRadioButtonQuestions, ...overallDropdownQuestions];
                const aiResponse = await processQuestionsAI(questions);
                if (aiResponse) {
                    const { inputs, dropdowns, radios } = aiResponse;
                    prefillableData = { inputs, dropdowns, radios };
                }
                return runFindEasyApply();
            }

            const btn = reviewBtn || nextBtn!;
            if (!fetchingFieldValues) await runValidations(prefillableData);

            if (await checkForError()) {
                await terminateJobModel();
                await addShortDelay();
            } else {
                await addDelay();
                const progressBar = document.querySelector<HTMLProgressElement>('.artdeco-completeness-meter-linear__progress-container progress');
                if (!progressBar) {
                    await terminateJobModel();
                    return;
                }
                await addDelay();
                btn.click();
                await closeApplicationSentModal();
                await addShortDelay();
                return runApplyModel(fetchingFieldValues, overallInputQuestions, overallRadioButtonQuestions, overallDropdownQuestions, prefillableData);
            }
        } else {
            document.querySelector<HTMLElement>('.artdeco-modal__dismiss')?.click();
        }
    } catch (e) {
        console.error('Error in runApplyModel:', e);
    }
}

// Function to navigate through easy apply
export async function navigateThroughEasyApply() {
    await validateAndCloseConfirmationModal();
    const inputQuestions = await gatherInputFieldChecks();
    const radioQuestions = await gatherRadioButtonChecks();
    const dropdownQuestions = await gatherDropdownChecks();
    return [inputQuestions, radioQuestions, dropdownQuestions];
}

// Function to gather input field checks
export async function gatherInputFieldChecks() {
    const questions: string[] = [];

    const containers = document.querySelectorAll('.fb-dash-form-element');
    containers.forEach((container) => {
        const label = container.querySelector('.artdeco-text-input--label');
        const input = container.querySelector('.artdeco-text-input--input') as HTMLInputElement | null;

        if (label && input) {
            const labelText = label.textContent?.trim() || '';
            if (input.value.trim() === '') {
                input.value = defaultFields.YearsOfExperience;
                ['keydown', 'keypress', 'input', 'keyup'].forEach(eventType => {
                    input.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                input.dispatchEvent(new Event('change', { bubbles: true }));
                questions.push(labelText);
            }
        }
    });

    return questions;
}

// Function to gather radio button checks
export async function gatherRadioButtonChecks() {
    const questions: string[] = [];

    const fieldsets = document.querySelectorAll('fieldset[data-test-form-builder-radio-button-form-component="true"]');
    fieldsets.forEach((fieldset) => {
        const legend = fieldset.querySelector('legend');
        if (legend) {
            const questionText = legend.textContent?.trim() || '';
            const firstRadio = fieldset.querySelector('input[type="radio"]') as HTMLInputElement | null;

            if (firstRadio) {
                firstRadio.checked = true;
                firstRadio.dispatchEvent(new Event('change', { bubbles: true }));

                const options: string[] = [];
                const radios = fieldset.querySelectorAll('input[type="radio"]');
                radios.forEach((radio) => {
                    const inputRadio = radio as HTMLInputElement;
                    const label = fieldset.querySelector(`label[for="${inputRadio.id}"]`);
                    const optionText = label ? label.textContent?.trim() : inputRadio.value;
                    options.push(optionText || '');
                });

                questions.push(`question: ${questionText} || options: ${options.join(', ')}`);
            }
        }
    });

    return questions;
}

// Function to gather dropdown checks
export async function gatherDropdownChecks() {
    const questions: string[] = [];

    const selects = document.querySelectorAll('.fb-dash-form-element select');
    selects.forEach((select, index) => {
        const selectElement = select as HTMLSelectElement;
        const parentElement = selectElement.closest('.fb-dash-form-element');
        if (!parentElement) return;

        const labelElement = parentElement.querySelector('label') as HTMLLabelElement | null;
        let labelText = labelElement ? labelElement.textContent?.trim() : '';

        if (!labelText) {
            labelText = `Dropdown ${index}`;
        }

        const options: string[] = [];
        for (let i = 0; i < selectElement.options.length; i++) {
            options.push(selectElement.options[i].textContent?.trim() || '');
        }

        // If there are more than 5 options, only show first 5 and add "..."
        let displayOptions = '';
        if (options.length > 5) {
            displayOptions = options.slice(0, 5).join(', ') + ',...';
        } else {
            displayOptions = options.join(', ');
        }

        questions.push(`question: ${labelText} || options: ${displayOptions}`);

        // Select the second option if available (first might be a placeholder)
        const secondOption = selectElement.options[1];
        if (secondOption && selectElement.selectedIndex < 1) {
            secondOption.selected = true;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    return questions;
}

// Function to run the "Find Easy Apply" process
export async function runFindEasyApply() {
    console.log('runFindEasyApply: Starting function');
    
    try {
        // Try multiple selectors for the Easy Apply button
        const selectors = [
            'button.jobs-apply-button',
            'button[data-test-autoapply-button]',
            'button[data-test-easy-apply-button]',
            'button[data-control-name="apply"]',
            '.jobs-apply-button'
        ];

        let applyButton: HTMLElement | null = null;

        // Try each selector until we find a button
        for (const selector of selectors) {
            const button = document.querySelector(selector) as HTMLElement | null;
            if (button) {
                console.log(`runFindEasyApply: Found apply button with selector: ${selector}`);
                applyButton = button;
                break;
            }
        }

        // If we still haven't found a button, log all buttons on the page
        if (!applyButton) {
            console.log('runFindEasyApply: No apply button found with standard selectors');
            const allButtons = document.querySelectorAll('button');
            console.log(`runFindEasyApply: Total buttons found on page: ${allButtons.length}`);
            
            // Log button texts to help identify the apply button
            allButtons.forEach((button, index) => {
                const text = button.textContent?.trim() || 'No text';
                const ariaLabel = button.getAttribute('aria-label') || 'No aria-label';
                console.log(`runFindEasyApply: Button ${index} - Text: "${text}", aria-label: "${ariaLabel}"`);
            });
        }

        if (applyButton) {
            console.log('runFindEasyApply: Clicking apply button');
            applyButton.click();
            await addDelay();
            console.log('runFindEasyApply: Completed clicking apply button');
            
            // Initiate the application process
            console.log('runFindEasyApply: Starting application process');
            await runApplyModel();
        } else {
            console.log('runFindEasyApply: Apply button not found');
        }
    } catch (error) {
        console.error('runFindEasyApply: Error finding or clicking apply button:', error);
    }
    
    console.log('runFindEasyApply: Function completed');
}

// Function to process questions with AI
export async function processQuestionsAI(questions: string[]): Promise<any> {
    console.log('Starting AI processing for form questions...');
    
    try {
        // Get access token
        const accessToken = await new Promise<string | null>((resolve) => {
            chrome.storage.local.get('accessToken', result => {
                resolve(result.accessToken || null);
            });
        });

        if (!accessToken) {
            console.warn('Access token not found, skipping AI processing.');
            return false;
        }

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
                    query: `You are a form-filling assistant that extracts information from a resume to accurately complete form fields.
                      Instructions:
                      1. Analyze the provided resume data and context carefully.
                      2. STRICTLY use fields that exist in the CONTEXT object. Do not add any fields not explicitly listed.
                      3. Calculate total inputs, dropdowns, and radios based on the provided CONTEXT. Make sure output has exact number of items in each section.
                      4. Match resume information to the appropriate form fields.
                      5. Format the output as valid JSON ONLY.
                      Key Rules:
                      - Inputs: Use exact question text as key, value should be calculated/extracted value. For work experience, use numbers only (e.g., "9").
                      - Dropdowns: Use clean question text (remove "question:" prefix) as key, value must be exact option text from options list.
                      - Radios: Use clean question text (remove "question:" prefix) as key, value must be exact option text from options list.
                      - Empty Sections: If CONTEXT array is empty, corresponding output section must be empty object.
                      RESUME: ${JSON.stringify(defaultFields)}
                      CONTEXT: {"inputs": ${JSON.stringify(questions.filter(q => !q.includes('|| options:')))}, "dropdowns": ${JSON.stringify(questions.filter(q => q.includes('|| options:')))}, "radios": ${JSON.stringify(questions.filter(q => q.includes('|| options:')))}}. NOTE: Calculate total inputs, dropdowns, and radios inside them based on the provided **CONTEXT**. Make sure output has exact number of inputs, dropdowns, and radios items in it. If possible convert it into a dictionary where keys are the field names and values are the field values. Give it to me if i ask for it.`
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

                const parsedContent = JSON.parse(jsonString);
                const inputs = parsedContent?.inputs;
                const dropdowns = parsedContent?.dropdowns;
                const radios = parsedContent?.radios;

                console.log('Inputs Q&A:', inputs);
                console.log('Dropdowns Q&A:', dropdowns);
                console.log('Radios Q&A:', radios);

                return { inputs, dropdowns, radios };
            } catch (error) {
                console.error('Custom AI API Error:', error);
                return false;
            }
        } else {
            const accessToken = await new Promise<string | null>((resolve) => {
                chrome.storage.local.get('accessToken', result => {
                    resolve(result.accessToken || null);
                });
            });

            if (!accessToken) {
                console.warn('Access token not found, skipping AI processing.');
                return false;
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
                                text: `You are a form-filling assistant that extracts information from a resume to accurately complete form fields.
                      Instructions:
                      1. Analyze the provided resume data and context carefully.
                      2. STRICTLY use fields that exist in the CONTEXT object. Do not add any fields not explicitly listed.
                      3. Calculate total inputs, dropdowns, and radios based on the provided CONTEXT. Make sure output has exact number of items in each section.
                      4. Match resume information to the appropriate form fields.
                      5. Format the output as valid JSON ONLY.
                      Key Rules:
                      - Inputs: Use exact question text as key, value should be calculated/extracted value. For work experience, use numbers only (e.g., "9").
                      - Dropdowns: Use clean question text (remove "question:" prefix) as key, value must be exact option text from options list.
                      - Radios: Use clean question text (remove "question:" prefix) as key, value must be exact option text from options list.
                      - Empty Sections: If CONTEXT array is empty, corresponding output section must be empty object.
                      RESUME: ${JSON.stringify(defaultFields)}
                      CONTEXT: {"inputs": ${JSON.stringify(questions.filter(q => !q.includes('|| options:')))}, "dropdowns": ${JSON.stringify(questions.filter(q => q.includes('|| options:')))}, "radios": ${JSON.stringify(questions.filter(q => q.includes('|| options:')))}}. NOTE: Calculate total inputs, dropdowns, and radios inside them based on the provided **CONTEXT**. Make sure output has exact number of inputs, dropdowns, and radios items in it. If possible convert it into a dictionary where keys are the field names and values are the field values. Give it to me if i ask for it.`
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

                const parsedContent = JSON.parse(jsonString);
                const inputs = parsedContent?.inputs;
                const dropdowns = parsedContent?.dropdowns;
                const radios = parsedContent?.radios;

                console.log('Inputs Q&A:', inputs);
                console.log('Dropdowns Q&A:', dropdowns);
                console.log('Radios Q&A:', radios);

                return { inputs, dropdowns, radios };
            } catch (error) {
                console.error('Error processing with AI:', error);
                return false;
            }
        }
    } catch (error) {
        console.error('Error processing questions with AI:', error);
        return false;
    }
}
