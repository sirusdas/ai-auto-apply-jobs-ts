// Navigation utility functions for the auto-apply extension

import { addDelay as importedAddDelay, addShortDelay as importedAddShortDelay } from '../core';

// Export the delay functions
export const addDelay = importedAddDelay;
export const addShortDelay = importedAddShortDelay;

// Function to handle script termination
export async function handleScriptTermination() {
    try {
        console.log('Terminating script...');

        // Try to close any open modals
        const modalSelectors = [
            'button[aria-label="Dismiss"]',
            'button.artdeco-modal__dismiss',
            '.artdeco-modal__dismiss'
        ];

        for (const selector of modalSelectors) {
            const dismissButton = document.querySelector(selector) as HTMLElement | null;
            if (dismissButton) {
                dismissButton.click();
                dismissButton.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            }
        }

        // Try to close any dialogs
        const dialogSelectors = [
            'button[data-test-dialog-primary-button]',
            '.artdeco-dialog__dismiss',
            'button[data-control-name="discard_application_confirm_btn"]'
        ];

        for (const selector of dialogSelectors) {
            const dialogButton = document.querySelector(selector) as HTMLElement | null;
            if (dialogButton) {
                dialogButton.click();
                dialogButton.dispatchEvent(new Event('change', { bubbles: true }));
                await addShortDelay();
            }
        }

        console.log('Script termination completed');
    } catch (error) {
        console.error('Error during script termination:', error);
    }
}

// Function to go to the next page
export async function goToNextPage() {
    const nextButton = document.querySelector('button[aria-label="Next"]');
    if (nextButton) {
        (nextButton as HTMLElement).click();
        await addDelay();
    }
}