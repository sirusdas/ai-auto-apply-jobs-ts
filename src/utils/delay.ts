export async function addVeryShortDelay(): Promise<void> {
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
  const longDelay = await new Promise<number>(resolve => {
    chrome.storage.local.get('longDelay', (result) => {
      resolve(result.longDelay || 7000);
    });
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, longDelay);
  });
}