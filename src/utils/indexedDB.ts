/**
 * IndexedDB utility for storing applied jobs
 * Replaces chrome.storage.local which has a 10MB limit
 */

// Database configuration
const DB_NAME = 'AppliedJobsDB';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';

export interface AppliedJob {
  id: string;              // unique: `${company}-${appliedDate}`
  jobTitle: string;
  company: string;
  location: string;
  appliedDate: string;
  applicationFormData?: any;
  archived?: boolean;
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
 */
export function saveJob(job: AppliedJob): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(job);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save job:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get all non-archived jobs
 */
export function getAllJobs(): Promise<AppliedJob[]> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('archived');
      
      // Get only non-archived jobs (archived = 0 or false)
      const request = index.getAll(IDBKeyRange.only(0));

      request.onsuccess = () => {
        const jobs = request.result as AppliedJob[];
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
      const index = store.index('archived');
      
      // Get only archived jobs (archived = 1 or true)
      const request = index.getAll(IDBKeyRange.only(1));

      request.onsuccess = () => {
        const jobs = request.result as AppliedJob[];
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
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete job:', request.error);
        reject(request.error);
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
        const putRequest = store.put(updatedJob);
        
        putRequest.onsuccess = () => {
          resolve();
        };
        
        putRequest.onerror = () => {
          console.error('Failed to update job:', putRequest.error);
          reject(putRequest.error);
        };
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
 * Note: IndexedDB doesn't provide direct size APIs, this is an estimate
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
        
        // Estimate size by JSON stringification
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
 * Sets archived = true for jobs older than the specified duration
 * Returns the count of archived jobs
 */
export function archiveOldJobs(months: number): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      const cutoffTimestamp = cutoffDate.getTime();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      
      // Get all jobs created before the cutoff date
      const request = index.getAll(IDBKeyRange.upperBound(cutoffTimestamp));
      
      let archivedCount = 0;
      const jobsToArchive: AppliedJob[] = [];
      
      request.onsuccess = () => {
        const jobs = request.result as AppliedJob[];
        
        // Mark each job as archived
        jobs.forEach((job) => {
          if (!job.archived) {
            job.archived = true;
            jobsToArchive.push(job);
          }
        });
        
        if (jobsToArchive.length === 0) {
          resolve(0);
          return;
        }
        
        // Save updated jobs
        const putTransaction = getTransaction('readwrite');
        const putStore = putTransaction.objectStore(STORE_NAME);
        
        jobsToArchive.forEach((job) => {
          const putRequest = putStore.put(job);
          putRequest.onsuccess = () => {
            archivedCount++;
            if (archivedCount === jobsToArchive.length) {
              resolve(archivedCount);
            }
          };
          putRequest.onerror = () => {
            console.error('Failed to archive job:', putRequest.error);
          };
        });
        
        // Fallback timeout in case onsuccess doesn't fire for all
        if (jobsToArchive.length === 0) {
          resolve(0);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get old jobs for archiving:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Permanently delete old jobs (both archived and non-archived)
 * Returns the count of deleted jobs
 */
export function clearOldJobs(months: number): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      const cutoffTimestamp = cutoffDate.getTime();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      
      // Get all jobs created before the cutoff date
      const request = index.getAllKeys(IDBKeyRange.upperBound(cutoffTimestamp));
      
      let deletedCount = 0;
      const idsToDelete: string[] = [];
      
      request.onsuccess = () => {
        const keys = request.result as string[];
        idsToDelete.push(...keys);
        
        if (idsToDelete.length === 0) {
          resolve(0);
          return;
        }
        
        // Delete each job
        idsToDelete.forEach((id) => {
          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => {
            deletedCount++;
            if (deletedCount === idsToDelete.length) {
              resolve(deletedCount);
            }
          };
          deleteRequest.onerror = () => {
            console.error('Failed to delete job:', deleteRequest.error);
          };
        });
        
        // Fallback timeout
        if (idsToDelete.length === 0) {
          resolve(0);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get old jobs for deletion:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Import from chrome.storage.local format
 * Expected format: { "2026-02-08": [{ jobTitle, company, location, appliedDate, applicationFormData }] }
 * Returns the count of imported jobs
 */
export function migrateFromChromeStorage(data: ChromeStorageFormat): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      let importedCount = 0;
      const jobsToImport: AppliedJob[] = [];
      
      // Process each date in the chrome storage data
      for (const [date, jobs] of Object.entries(data)) {
        for (const job of jobs) {
          // Create unique ID from company and applied date
          const id = `${job.company}-${job.appliedDate}`;
          
          // Determine createdAt from appliedDate
          const appliedDateObj = new Date(job.appliedDate);
          const createdAt = appliedDateObj.getTime();
          
          jobsToImport.push({
            id,
            jobTitle: job.jobTitle,
            company: job.company,
            location: job.location,
            appliedDate: job.appliedDate,
            applicationFormData: job.applicationFormData,
            archived: false,
            createdAt
          });
        }
      }
      
      if (jobsToImport.length === 0) {
        resolve(0);
        return;
      }
      
      // Use transaction to bulk add all jobs
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      jobsToImport.forEach((job) => {
        const request = store.put(job);
        request.onsuccess = () => {
          importedCount++;
          if (importedCount === jobsToImport.length) {
            resolve(importedCount);
          }
        };
        request.onerror = () => {
          console.error('Failed to import job:', request.error);
        };
      });
      
      // Fallback timeout
      if (jobsToImport.length === 0) {
        resolve(0);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Clear all jobs (for migration/reset)
 */
export function clearAllJobs(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await initDB();
      
      const transaction = getTransaction('readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to clear all jobs:', request.error);
        reject(request.error);
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
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to get job count:', request.error);
        reject(request.error);
      };
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
      
      request.onsuccess = () => {
        resolve(request.result !== undefined);
      };
      
      request.onerror = () => {
        console.error('Failed to check if job exists:', request.error);
        reject(request.error);
      };
    } catch (error) {
      reject(error);
    }
  });
}
