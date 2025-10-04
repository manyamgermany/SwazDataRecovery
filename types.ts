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
  size: string;
  recoveryChance: 'High' | 'Medium' | 'Low';
  path: string;
  // For images, we can use a placeholder URL
  previewUrl?: string; 
  // For documents, we can store mock content
  content?: string;
}

export enum DriveType {
    HDD = 'HDD',
    SSD = 'SSD',
    USB = 'USB / Flash Drive',
    RAID = 'RAID Array',
    Mobile = 'Mobile Device'
}

export interface Drive {
  name: string;
  type: DriveType;
  size: string;
  id: string;
}

export enum AppStep {
    SELECT_DRIVE,
    SCANNING,
    RESULTS
}

export interface TransferHistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  date: number; // Stored as a timestamp
  status: 'Sent' | 'Received' | 'Canceled';
}
