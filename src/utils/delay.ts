export async function addVeryShortDelay(): Promise<void> {
  // Check if extension context is still valid
  try {
    chrome.runtime.getManifest();
  } catch (e: any) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      throw new Error('Extension context invalidated');
    }
  }

  const veryShortDelay = await new Promise<number>(resolve => {
    chrome.storage.local.get('veryShortDelay', (result) => {
      resolve(result.veryShortDelay || 1000);
    });
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, veryShortDelay);
  });
}

export async function addShortDelay(): Promise<void> {
  // Check if extension context is still valid
  try {
    chrome.runtime.getManifest();
  } catch (e: any) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      throw new Error('Extension context invalidated');
    }
  }

  const shortDelay = await new Promise<number>(resolve => {
    chrome.storage.local.get('shortDelay', (result) => {
      resolve(result.shortDelay || 5000);
    });
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, shortDelay);
  });
}

export async function addDelay(): Promise<void> {
  // Check if extension context is still valid
  try {
    chrome.runtime.getManifest();
  } catch (e: any) {
    if (e.message && e.message.includes('Extension context invalidated')) {
      throw new Error('Extension context invalidated');
    }
  }

  const longDelay = await new Promise<number>(resolve => {
    chrome.storage.local.get('longDelay', (result) => {
      resolve(result.longDelay || 10000);
    });
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, longDelay);
  });
}