import { TransferHistoryEntry } from '../types';

const HISTORY_KEY = 'swaz-transfer-history';

export const getHistory = (): TransferHistoryEntry[] => {
    try {
        const historyJson = localStorage.getItem(HISTORY_KEY);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Failed to parse transfer history from localStorage", error);
        return [];
    }
};

export const addHistoryEntry = (entryData: Omit<TransferHistoryEntry, 'id' | 'date'>): TransferHistoryEntry[] => {
    const currentHistory = getHistory();
    const newEntry: TransferHistoryEntry = {
        ...entryData,
        id: `${Date.now()}-${entryData.fileName}`,
        date: Date.now(),
    };
    
    // Keep history to a reasonable size, e.g., 50 entries
    const newHistory = [newEntry, ...currentHistory].slice(0, 50);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
        console.error("Failed to save transfer history to localStorage", error);
    }
    
    return newHistory;
};

export const clearHistory = (): TransferHistoryEntry[] => {
    try {
        localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
        console.error("Failed to clear transfer history from localStorage", error);
    }
    return [];
};
