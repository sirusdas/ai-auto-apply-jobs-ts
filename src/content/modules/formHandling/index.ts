// Form handling functionality for the auto-apply extension

import { addShortDelay, addDelay, defaultFields } from '../core';

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
    // Handle safety reminders first
    await performSafetyReminderCheck();
    
    // Perform various field checks
    await performInputFieldChecks(prefillableData);
    await performInputFieldCityCheck();
    await performCheckBoxFieldCityCheck();
    await performRadioButtonChecks(prefillableData);
    await performDropdownChecks(prefillableData);
    
    // Check for errors
    await checkForError();
}