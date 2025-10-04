
import { Drive, DriveType, RecoveredFile, FileType } from '../types';

export const mockDrives: Drive[] = [
  { id: 'd1', name: 'Main OS (C:)', type: DriveType.SSD, size: '476 GB' },
  { id: 'd2', name: 'Backup Drive (D:)', type: DriveType.HDD, size: '1.81 TB' },
  { id: 'd3', name: 'SanDisk USB (E:)', type: DriveType.USB, size: '58.2 GB' },
];

// Fix: Add explicit Record type to help TypeScript understand the object's structure and fix indexing error.
const fileNames: Record<FileType, string[]> = {
  [FileType.Image]: ['holiday_photo.jpg', 'family_portrait.png', 'vacation_sunset.jpeg', 'project_diagram.tiff', 'logo_design.svg'],
  [FileType.Video]: ['birthday_party.mp4', 'conference_recording.mov', 'drone_footage.avi', 'wedding_highlights.mkv'],
  [FileType.Document]: ['quarterly_report.docx', 'presentation_slides.pptx', 'project_proposal.pdf', 'meeting_notes.txt', 'financial_data.xlsx'],
  [FileType.Audio]: ['podcast_interview.mp3', 'voice_memo_01.wav', 'concert_bootleg.flac', 'background_music.ogg'],
};

const fileContents = {
  [FileType.Document]: [
    "This document outlines the financial performance for the last quarter, showing a 15% increase in revenue.",
    "Project Phoenix aims to revamp the user interface for our flagship product. Key milestones include user research, wireframing, and prototype testing.",
    "Meeting Notes: Key takeaways include aligning on the marketing strategy and allocating budget for the upcoming campaign.",
  ]
};

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const simulateFileRecovery = (drive: Drive): Promise<RecoveredFile[]> => {
  return new Promise((resolve) => {
    const recoveredFiles: RecoveredFile[] = [];
    const fileCount = 20 + Math.floor(Math.random() * 30); // Recover 20-50 files

    for (let i = 0; i < fileCount; i++) {
      const typeValues = Object.values(FileType);
      const randomType = getRandomElement(typeValues);
      const chanceValue = Math.random();
      const recoveryChance = chanceValue > 0.7 ? 'High' : chanceValue > 0.3 ? 'Medium' : 'Low';
      const size = `${(Math.random() * 100).toFixed(2)} MB`;
      const name = getRandomElement(fileNames[randomType]);
      const id = `${drive.id}-file-${i}-${Date.now()}`;

      const file: RecoveredFile = {
        id,
        name: `${i}_${name}`,
        type: randomType,
        size,
        recoveryChance,
        path: `${drive.name.split(' ')[1].replace('(', '').replace(')', '')}/Users/Recovered/${name}`,
      };
      
      if(file.type === FileType.Image) {
        // use picsum for placeholder images
        file.previewUrl = `https://picsum.photos/seed/${id}/800/600`;
      }

      if(file.type === FileType.Document) {
        file.content = getRandomElement(fileContents[FileType.Document]);
      }

      recoveredFiles.push(file);
    }
    
    // Simulate network delay
    setTimeout(() => {
      resolve(recoveredFiles);
    }, 2000 + Math.random() * 3000); // Simulate scanning time
  });
};
