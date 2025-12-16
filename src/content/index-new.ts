// Main entry point for the content script
// This file imports and initializes all modules

import { createMainButton } from './modules/ui';
import { startAutoApplyProcess, stopAutoApplyProcess } from './modules/process';

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createMainButton);
} else {
    createMainButton();
}

// Make functions available globally for UI event handlers
(window as any).startAutoApplyProcess = startAutoApplyProcess;
(window as any).stopAutoApplyProcess = stopAutoApplyProcess;

export { };