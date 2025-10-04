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

export enum DriveType {
  SSD = 'SSD',
  HDD = 'HDD',
  USB = 'USB',
  RAID = 'RAID',
  Mobile = 'Mobile',
}
