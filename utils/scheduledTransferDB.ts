// A simple IndexedDB wrapper for persisting scheduled file transfers.

const DB_NAME = 'swaz-scheduled-transfer';
const DB_VERSION = 1;
const STORE_NAME = 'jobs';
const JOB_KEY = 'current_job';

let dbPromise: Promise<IDBDatabase> | null = null;

// Establishes a connection to the IndexedDB database.
function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject('Error opening IndexedDB.');
                dbPromise = null;
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            // This event is only triggered for version changes.
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // Create an object store to hold our single job object.
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }
    return dbPromise;
}

export interface ScheduledJob {
    files: File[];
    scheduledTime: number;
    roomId: string;
}

/**
 * Saves a scheduled transfer job to IndexedDB.
 * Since we only allow one scheduled job at a time, it overwrites any existing job.
 * @param job - The job object containing files, scheduled time, and room ID.
 */
export async function saveScheduledJob(job: ScheduledJob): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(job, JOB_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to save scheduled job to IndexedDB.');
    });
}

/**
 * Retrieves the currently scheduled transfer job from IndexedDB.
 * @returns A promise that resolves with the job object, or null if no job is found.
 */
export async function getScheduledJob(): Promise<ScheduledJob | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(JOB_KEY);

        request.onsuccess = () => {
            resolve(request.result || null);
        };
        request.onerror = () => {
            reject('Failed to retrieve scheduled job from IndexedDB.');
        };
    });
}

/**
 * Clears any scheduled transfer job from IndexedDB.
 */
export async function clearScheduledJob(): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(JOB_KEY);

        request.onsuccess = () => resolve();
        request.onerror = () => reject('Failed to clear scheduled job from IndexedDB.');
    });
}