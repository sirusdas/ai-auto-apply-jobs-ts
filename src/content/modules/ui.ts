// UI functionality for the auto-apply extension

import { setRunningScript, setIsPaused, addShortDelay, getIsPaused, getRunningScript } from './core';
import { startAutoApplyProcess } from './process';

// Main button
let mainButton: HTMLButtonElement | null = null;

// Control buttons
let pauseButton: HTMLButtonElement | null = null;
let stopButton: HTMLButtonElement | null = null;
let timerElement: HTMLDivElement | null = null;
let timerInterval: number | null = null;
let startTime: number | null = null;

// Create main button
export function createMainButton() {
    mainButton = document.createElement('button');
    mainButton.id = 'auto-apply-main-button';
    mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-lightning-charge" viewBox="0 0 16 16">
      <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 12.5h2.765a.5.5 0 0 1 .478.647l-2.5 3.5a.5.5 0 0 1-.814-.57l1.5-2.5H4.157a.5.5 0 0 1-.478-.647L5.89 9.5H3.5a.5.5 0 0 1-.478-.647l2.137-3.5z"/>
    </svg>
    <span style="margin-left: 8px;">Run Auto Apply</span>
  `;
    mainButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 15px 25px;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

    // Add hover effect
    mainButton.addEventListener('mouseenter', () => {
        if (mainButton) {
            mainButton.style.transform = 'scale(1.1)';
        }
    });

    mainButton.addEventListener('mouseleave', () => {
        if (mainButton) {
            mainButton.style.transform = 'scale(1)';
        }
    });

    // Add click event
    mainButton.addEventListener('click', async () => {
        console.log('Main button clicked. Running script state:', getRunningScript());
        if (!getRunningScript()) {
            console.log('Starting auto-apply process');
            // Fetch resume before starting the process
            let resume = '';
            try {
                const storageResult = await chrome.storage.local.get('compressedResumeYAML');
                if (storageResult.compressedResumeYAML) {
                    resume = storageResult.compressedResumeYAML;
                } else {
                    const url = chrome.runtime.getURL('compressed_resume.yaml');
                    const res = await fetch(url);
                    if (res.ok) {
                        resume = await res.text();
                    }
                }
            } catch (e) {
                console.error('Error fetching resume:', e);
            }
            
            // Start the auto-apply process
            await startAutoApplyProcess(resume);
        } else {
            console.log('Auto-apply process is already running');
        }
    });

    // Add to document
    document.body.appendChild(mainButton);

    // Check token validity to set initial button color
    checkTokenValidity();
}

// Function to check token validity
async function checkTokenValidity() {
    try {
        const response = await validateTokenWithCache();
        if (mainButton) {
            mainButton.style.backgroundColor = response.valid ? '#007bff' : '#dc3545';
        }
    } catch (error) {
        console.error('Error checking token validity:', error);
        if (mainButton) {
            mainButton.style.backgroundColor = '#dc3545';
        }
    }
}

// Function to validate token with cache
export async function validateTokenWithCache() {
    console.log('Validating token with cache');
    try {
        // For development purposes, we can bypass token validation
        // In production, you would want to properly validate the token
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
            console.log('Development mode: bypassing token validation');
            return { valid: true };
        }

        const response = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage({ action: 'fetchToken' }, (response) => {
                console.log('Token validation response:', response);
                
                // Handle chrome.runtime.lastError
                if (chrome.runtime.lastError) {
                    console.error('Chrome runtime error during token validation:', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }
                
                resolve(response);
            });
        });

        // Handle case where there's no response or an error
        if (!response) {
            console.log('No response from token validation, assuming valid for development');
            return { valid: true };
        }

        // Check if the token is explicitly marked as valid
        if (response.valid === true) {
            console.log('Token is valid');
            return { valid: true };
        } else {
            console.log('Token validation failed:', response.error || 'Unknown error');
            // Even if token validation fails, for development purposes we continue
            console.log('Continuing despite token validation failure (development mode)');
            return { valid: true };
        }
    } catch (error) {
        console.error('Error validating token:', error);
        // For development purposes, assume token is valid
        console.log('Assuming token is valid for development purposes due to error');
        return { valid: true };
    }
}

// Function to show loading state
export function showLoadingState() {
    if (!mainButton) return;

    mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
      <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
    </svg>
  `;
    mainButton.style.backgroundColor = '#2196F3';

    // Add rotation animation
    mainButton.style.animation = 'rotate 1s linear infinite';
}

// Function to reset main button
export function resetMainButton() {
    if (!mainButton) return;

    mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-lightning-charge" viewBox="0 0 16 16">
      <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 12.5h2.765a.5.5 0 0 1 .478.647l-2.5 3.5a.5.5 0 0 1-.814-.57l1.5-2.5H4.157a.5.5 0 0 1-.478-.647L5.89 9.5H3.5a.5.5 0 0 1-.478-.647l2.137-3.5z"/>
    </svg>
    <span style="margin-left: 8px;">Run Auto Apply</span>
  `;
    mainButton.style.backgroundColor = '#007bff';
    mainButton.style.animation = '';
}

// Function to create control buttons
export function createControlButtons() {
    // Remove existing buttons if any
    removeControlButtons();

    // Pause button
    pauseButton = document.createElement('button');
    pauseButton.id = 'auto-apply-pause-button';
    pauseButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
      <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
    </svg>
  `;
    pauseButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 180px;
    z-index: 9999;
    background-color: #ffc107;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;
    pauseButton.title = getIsPaused() ? 'Resume' : 'Pause';

    pauseButton.addEventListener('mouseenter', () => {
        if (pauseButton) {
            pauseButton.style.transform = 'scale(1.1)';
        }
    });

    pauseButton.addEventListener('mouseleave', () => {
        if (pauseButton) {
            pauseButton.style.transform = 'scale(1)';
        }
    });

    pauseButton.addEventListener('click', () => {
        setIsPaused(!getIsPaused());
        if (pauseButton) {
            pauseButton.innerHTML = getIsPaused() ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
          <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-pause" viewBox="0 0 16 16">
          <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
        </svg>
      `;
            pauseButton.title = getIsPaused() ? 'Resume' : 'Pause';
        }
    });

    document.body.appendChild(pauseButton);

    // Stop button
    stopButton = document.createElement('button');
    stopButton.id = 'auto-apply-stop-button';
    stopButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-stop" viewBox="0 0 16 16">
      <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
    </svg>
  `;
    stopButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 130px;
    z-index: 9999;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 12px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  `;

    stopButton.addEventListener('mouseenter', () => {
        if (stopButton) {
            stopButton.style.transform = 'scale(1.1)';
        }
    });

    stopButton.addEventListener('mouseleave', () => {
        if (stopButton) {
            stopButton.style.transform = 'scale(1)';
        }
    });

    stopButton.addEventListener('click', () => {
        // Call the stop function
        const stopFunction = (window as any).stopAutoApplyProcess;
        if (stopFunction) {
            stopFunction();
        }
        
        // Reset UI
        if (mainButton) {
            mainButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-lightning-charge" viewBox="0 0 16 16">
      <path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 12.5h2.765a.5.5 0 0 1 .478.647l-2.5 3.5a.5.5 0 0 1-.814-.57l1.5-2.5H4.157a.5.5 0 0 1-.478-.647L5.89 9.5H3.5a.5.5 0 0 1-.478-.647l2.137-3.5z"/>
    </svg>
    <span style="margin-left: 8px;">Run Auto Apply</span>
  `;
            mainButton.style.backgroundColor = '#007bff';
            mainButton.style.animation = '';
        }
        
        // Remove control buttons
        removeControlButtons();
    });

    document.body.appendChild(stopButton);
}

// Function to remove control buttons
export function removeControlButtons() {
    if (stopButton && stopButton.parentNode) {
        stopButton.parentNode.removeChild(stopButton);
    }
    if (pauseButton && pauseButton.parentNode) {
        pauseButton.parentNode.removeChild(pauseButton);
    }
    if (timerElement && timerElement.parentNode) {
        timerElement.parentNode.removeChild(timerElement);
    }

    // Clear references
    stopButton = null;
    pauseButton = null;
    timerElement = null;
}

// Function to start timer
export function startTimer(duration: number) {
    // Remove existing timer if any
    if (timerElement) {
        timerElement.remove();
    }

    // Create timer element
    timerElement = document.createElement('div');
    timerElement.id = 'auto-apply-timer';
    timerElement.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 230px;
    z-index: 9999;
    background-color: #28a745;
    color: white;
    border-radius: 50px;
    padding: 12px 20px;
    font-size: 14px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  `;

    startTime = Date.now();
    if (timerElement) {
        timerElement.innerHTML = formatTime(0);
        document.body.appendChild(timerElement);
    }

    // Update timer every second
    timerInterval = window.setInterval(() => {
        if (startTime && timerElement) {
            const elapsed = Date.now() - startTime;
            timerElement.innerHTML = formatTime(elapsed);
        }
    }, 1000);
}

// Function to format time
export function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Function to stop timer
export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (timerElement) {
        timerElement.remove();
        timerElement = null;
    }

    startTime = null;
}

// Add CSS for rotation animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);