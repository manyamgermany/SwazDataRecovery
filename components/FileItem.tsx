import React from 'react';
import { RecoveredFile, FileType } from '../types';
import { ImageIcon, VideoIcon, DocumentIcon, AudioIcon, EyeIcon } from './icons/Icons';
import { formatBytes } from '../utils/formatters';

interface FileItemProps {
  file: RecoveredFile;
  onPreview: (file: RecoveredFile) => void;
  onSelectToggle: (fileId: string) => void;
  isSelected: boolean;
}

const getFileIcon = (type: FileType) => {
  // Adjusted icon size for better alignment with the file name text.
  const commonClasses = "w-5 h-5 text-accent";
  switch(type) {
    case FileType.Image: return <ImageIcon className={commonClasses} />;
    case FileType.Video: return <VideoIcon className={commonClasses} />;
    case FileType.Document: return <DocumentIcon className={commonClasses} />;
    case FileType.Audio: return <AudioIcon className={commonClasses} />;
    default: return null;
  }
}

const getChanceBadgeClasses = (chance: 'High' | 'Medium' | 'Low') => {
    switch(chance) {
        case 'High': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
        case 'Medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
        case 'Low': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
}

const FileItem: React.FC<FileItemProps> = ({ file, onPreview, onSelectToggle, isSelected }) => {
  return (
    <div className={`flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 ${isSelected ? 'border-accent' : 'border-transparent'}`}>
      <input 
        type="checkbox" 
        checked={isSelected}
        onChange={() => onSelectToggle(file.id)}
        className="w-5 h-5 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent dark:focus:ring-accent dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-4 flex-shrink-0" 
        aria-label={`Select file ${file.name}`}
      />
      <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <div className="truncate">
            <div className="flex items-center gap-2">
                <div className="flex-shrink-0" aria-hidden="true">
                    {getFileIcon(file.type)}
                </div>
                <p className="font-semibold text-sm truncate text-text-light dark:text-text-dark" title={file.name}>
                    {file.name}
                </p>
            </div>
            <p className="text-xs text-gray-500 truncate pl-7 md:hidden" title={file.path}>
                {file.path}
            </p>
            {/* Mobile View Recovery Chance Badge */}
            <div className="pl-7 md:hidden mt-1">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getChanceBadgeClasses(file.recoveryChance)}`}>
                    {file.recoveryChance} Recovery Chance
                </span>
            </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">{formatBytes(file.size)}</div>
        
        {/* Desktop View Recovery Chance Badge */}
        <div className="hidden md:block">
             <span className={`px-2 py-1 text-sm font-semibold rounded-full ${getChanceBadgeClasses(file.recoveryChance)}`}>
                {file.recoveryChance}
            </span>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => onPreview(file)}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors"
            aria-label={`Preview file ${file.name}`}
          >
            <EyeIcon className="w-4 h-4" />
            <span>Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileItem;