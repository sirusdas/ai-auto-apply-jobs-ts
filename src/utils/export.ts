/**
 * Export utility for downloading applied jobs data
 * Supports JSON and CSV formats using Chrome's downloads API
 */

import { AppliedJob, getAllJobs, getArchivedJobs } from './indexedDB';

/**
 * Get the current date formatted for filenames (YYYY-MM-DD)
 */
function getFormattedDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCSVField(field: string | undefined): string {
  if (field === undefined || field === null) {
    return '';
  }
  const stringField = String(field);
  // If the field contains commas, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

/**
 * Convert bytes to human-readable format
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1 KB", "1 MB", "1 GB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Show up to 2 decimal places
  const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${sizeValue} ${sizes[i]}`;
}

/**
 * Get all jobs (optionally including archived)
 */
async function getJobsForExport(includeArchived: boolean): Promise<AppliedJob[]> {
  const [allJobs, archivedJobs] = await Promise.all([
    getAllJobs(),
    getArchivedJobs()
  ]);

  if (includeArchived) {
    // Combine all jobs, sort by createdAt descending
    const combined = [...allJobs, ...archivedJobs];
    combined.sort((a, b) => b.createdAt - a.createdAt);
    return combined;
  }

  return allJobs;
}

/**
 * Export applied jobs to a JSON file
 * @param includeArchived - Whether to include archived jobs (default: false)
 */
export async function exportJobsToJSON(includeArchived: boolean = false): Promise<void> {
  try {
    const jobs = await getJobsForExport(includeArchived);
    const dateStr = getFormattedDate();
    const filename = `applied-jobs-${dateStr}.json`;

    // Create JSON content with metadata
    const exportData = {
      exportDate: new Date().toISOString(),
      totalJobs: jobs.length,
      includeArchived,
      jobs
    };

    // Create blob from JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Convert blob to data URL for chrome.downloads
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    await new Promise<void>((resolve, reject) => {
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          
          // Use chrome.downloads.download() to trigger download
          await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: true, // Show save as dialog
            conflictAction: 'uniquify'
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read blob for export'));
      };
    });

    console.log(`Exported ${jobs.length} jobs to ${filename}`);
  } catch (error) {
    console.error('Failed to export jobs as JSON:', error);
    throw new Error(`Failed to export jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export applied jobs to a CSV file
 * @param includeArchived - Whether to include archived jobs (default: false)
 */
export async function exportJobsAsCSV(includeArchived: boolean = false): Promise<void> {
  try {
    const jobs = await getJobsForExport(includeArchived);
    const dateStr = getFormattedDate();
    const filename = `applied-jobs-${dateStr}.csv`;

    // CSV header row
    const headers = ['Date', 'Title', 'Company', 'Location'];
    const rows: string[] = [headers.join(',')];

    // Add data rows
    for (const job of jobs) {
      const row = [
        escapeCSVField(job.appliedDate),
        escapeCSVField(job.jobTitle),
        escapeCSVField(job.company),
        escapeCSVField(job.location)
      ];
      rows.push(row.join(','));
    }

    // Join all rows with newlines
    const csvContent = rows.join('\n');

    // Create blob from CSV string
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Convert blob to data URL for chrome.downloads
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    await new Promise<void>((resolve, reject) => {
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          
          // Use chrome.downloads.download() to trigger download
          await chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: true, // Show save as dialog
            conflictAction: 'uniquify'
          });
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read blob for export'));
      };
    });

    console.log(`Exported ${jobs.length} jobs to ${filename}`);
  } catch (error) {
    console.error('Failed to export jobs as CSV:', error);
    throw new Error(`Failed to export jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
