/**
 * IndexedDB utility for storing applied jobs
 * Replaces chrome.storage.local which has a 10MB limit
 */

// Database configuration
const DB_NAME = 'AppliedJobsDB';
const DB_VERSION = 2;
const STORE_NAME = 'jobs';

export interface AppliedJob {
  id: string;              // unique: `${company}-${appliedDate}`
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
  applicationFormData?: any;
  archived?: number;       // 0 for false, 1 for true (booleans are not valid IDB keys)
  createdAt: number;       // timestamp for sorting/archiving
}

interface ChromeStorageJob {
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
  applicationFormData?: any;
}

interface ChromeStorageFormat {
  [date: string]: ChromeStorageJob[];
}

// Database reference for reuse
let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the database, create object store if needed
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store with keyPath and indexes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for common queries
        store.createIndex('company', 'company', { unique: false });
        store.createIndex('appliedDate', 'appliedDate', { unique: false });
        store.createIndex('archived', 'archived', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Get a transaction for the jobs store
 */
function getTransaction(mode: IDBTransactionMode = 'readonly'): IDBTransaction {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return dbInstance.transaction(STORE_NAME, mode);
}

/**
 * Save a single job
 * Waits for transaction completion to ensure data is committed
 */
export function saveJob(job: AppliedJob): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);

      store.put(job);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction failed to save job:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get all non-archived jobs
 * More robust: Fetches all and filters in memory to avoid index issues
 */
export function getAllJobs(): Promise<AppliedJob[]> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allJobs = request.result as AppliedJob[];
        // Filter: non-archived (0 or undefined)
        const jobs = allJobs.filter(job => !job.archived || job.archived === 0);
        // Sort by createdAt descending (newest first)
        jobs.sort((a, b) => b.createdAt - a.createdAt);
        resolve(jobs);
      };

      request.onerror = () => {
        console.error('Failed to get jobs:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get only archived jobs
 */
export function getArchivedJobs(): Promise<AppliedJob[]> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allJobs = request.result as AppliedJob[];
        // Filter: only archived (1)
        const jobs = allJobs.filter(job => job.archived === 1);
        // Sort by createdAt descending (newest first)
        jobs.sort((a, b) => b.createdAt - a.createdAt);
        resolve(jobs);
      };

      request.onerror = () => {
        console.error('Failed to get archived jobs:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get a single job by ID
 */
export function getJobById(id: string): Promise<AppliedJob | undefined> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result as AppliedJob | undefined);
      };

      request.onerror = () => {
        console.error('Failed to get job by ID:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Delete a single job
 */
export function deleteJob(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction failed to delete job:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update a job with partial updates
 */
export function updateJob(id: string, updates: Partial<AppliedJob>): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // First get the existing job
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingJob = getRequest.result as AppliedJob | undefined;
        
        if (!existingJob) {
          reject(new Error(`Job with ID ${id} not found`));
          return;
        }
        
        // Merge updates with existing job
        const updatedJob: AppliedJob = {
          ...existingJob,
          ...updates,
          id: updates.id || existingJob.id // Preserve original ID
        };
        
        // Save the updated job
        store.put(updatedJob);
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        console.error('Transaction failed to update job:', transaction.error);
        reject(transaction.error);
      };
      
      getRequest.onerror = () => {
        console.error('Failed to get job for update:', getRequest.error);
        reject(getRequest.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate total storage size in bytes (approximate)
 */
export function getStorageSize(): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const jobs = request.result as AppliedJob[];
        const jsonString = JSON.stringify(jobs);
        const size = new Blob([jsonString]).size;
        resolve(size);
      };
      
      request.onerror = () => {
        console.error('Failed to calculate storage size:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Archive jobs older than N months
 * Sets archived = 1 for jobs older than the specified duration
 */
export function archiveOldJobs(months: number): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      const cutoffTimestamp = cutoffDate.getTime();
      
      const readTransaction = getTransaction('readonly');
      const readStore = readTransaction.objectStore(STORE_NAME);
      const index = readStore.index('createdAt');
      const request = index.getAll(IDBKeyRange.upperBound(cutoffTimestamp));
      
      request.onsuccess = async () => {
        const jobsToArchive = (request.result as AppliedJob[]).filter(j => !j.archived || j.archived === 0);
        
        if (jobsToArchive.length === 0) {
          resolve(0);
          return;
        }
        
        const writeTransaction = getTransaction('readwrite');
        const writeStore = writeTransaction.objectStore(STORE_NAME);
        
        jobsToArchive.forEach(job => {
          job.archived = 1;
          writeStore.put(job);
        });
        
        writeTransaction.oncomplete = () => {
          resolve(jobsToArchive.length);
        };
        
        writeTransaction.onerror = () => {
          console.error('Transaction failed to archive jobs:', writeTransaction.error);
          reject(writeTransaction.error);
        };
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Permanently delete old jobs (both archived and non-archived)
 */
export function clearOldJobs(months: number): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      const cutoffTimestamp = cutoffDate.getTime();
      
      const readTransaction = getTransaction('readonly');
      const readStore = readTransaction.objectStore(STORE_NAME);
      const index = readStore.index('createdAt');
      const request = index.getAllKeys(IDBKeyRange.upperBound(cutoffTimestamp));
      
      request.onsuccess = () => {
        const keysToDelete = request.result as string[];
        
        if (keysToDelete.length === 0) {
          resolve(0);
          return;
        }
        
        const writeTransaction = getTransaction('readwrite');
        const writeStore = writeTransaction.objectStore(STORE_NAME);
        
        keysToDelete.forEach(id => {
          writeStore.delete(id);
        });
        
        writeTransaction.oncomplete = () => {
          resolve(keysToDelete.length);
        };
        
        writeTransaction.onerror = () => {
          console.error('Transaction failed to clear old jobs:', writeTransaction.error);
          reject(writeTransaction.error);
        };
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Import from chrome.storage.local format
 */
export function migrateFromChromeStorage(data: ChromeStorageFormat): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const jobsToImport: AppliedJob[] = [];
      for (const [date, jobs] of Object.entries(data)) {
        for (const job of jobs) {
          const id = `${job.company}-${job.appliedDate}`;
          const appliedDateObj = new Date(job.appliedDate);
          const createdAt = appliedDateObj.getTime();
          
          jobsToImport.push({
            id,
            jobTitle: job.jobTitle,
            company: job.company,
            location: job.location,
            appliedDate: job.appliedDate,
            applicationFormData: job.applicationFormData,
            archived: 0,
            createdAt
          });
        }
      }
      
      if (jobsToImport.length === 0) {
        resolve(0);
        return;
      }
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      jobsToImport.forEach(job => {
        store.put(job);
      });
      
      transaction.oncomplete = () => {
        resolve(jobsToImport.length);
      };
      
      transaction.onerror = () => {
        console.error('Transaction failed to migrate jobs:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clear all jobs
 */
export function clearAllJobs(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('Transaction failed to clear all jobs:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get total count of all jobs
 */
export function getJobCount(): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if a job already exists (by ID)
 */
export function jobExists(id: string): Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getKey(id);
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}
