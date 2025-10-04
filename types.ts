export interface TransferHistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  date: number; // Stored as a timestamp
  status: 'Sent' | 'Received' | 'Canceled';
  fileType: string;
  duration?: number; // in seconds
  averageSpeed?: number; // in B/s
}

// Fix: Add missing type definitions used across the application.
export enum DriveType {
  SSD = 'SSD',
  HDD = 'HDD',
  USB = 'USB',
  RAID = 'RAID',
  Mobile = 'Mobile',
}

export interface Drive {
  id: string;
  name: string;
  type: DriveType;
  size: string;
}

export enum FileType {
  Image = 'Image',
  Video = 'Video',
  Document = 'Document',
  Audio = 'Audio',
}

export interface RecoveredFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  recoveryChance: 'High' | 'Medium' | 'Low';
  path: string;
  previewUrl?: string;
  content?: string;
}

export enum AppStep {
  DRIVE_SELECTION,
  SCANNING,
  RESULTS,
}