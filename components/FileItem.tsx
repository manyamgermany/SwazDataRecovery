
import React from 'react';
import { RecoveredFile, FileType } from '../types';
import { ImageIcon, VideoIcon, DocumentIcon, AudioIcon, EyeIcon } from './icons/Icons';

interface FileItemProps {
  file: RecoveredFile;
  onPreview: (file: RecoveredFile) => void;
  onSelectToggle: (fileId: string) => void;
  isSelected: boolean;
}

const getFileIcon = (type: FileType) => {
  const commonClasses = "w-8 h-8 mr-4 text-accent";
  switch(type) {
    case FileType.Image: return <ImageIcon className={commonClasses} />;
    case FileType.Video: return <VideoIcon className={commonClasses} />;
    case FileType.Document: return <DocumentIcon className={commonClasses} />;
    case FileType.Audio: return <AudioIcon className={commonClasses} />;
    default: return null;
  }
}

const getChanceColor = (chance: 'High' | 'Medium' | 'Low') => {
    switch(chance) {
        case 'High': return 'text-green-500';
        case 'Medium': return 'text-yellow-500';
        case 'Low': return 'text-red-500';
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
      />
      <div className="flex-shrink-0">
        {getFileIcon(file.type)}
      </div>
      <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <div className="truncate">
          <p className="font-semibold text-sm truncate text-text-light dark:text-text-dark">{file.name}</p>
          <p className="text-xs text-gray-500 truncate">{file.path}</p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">{file.size}</div>
        <div className={`font-semibold text-sm ${getChanceColor(file.recoveryChance)} hidden md:block`}>
          {file.recoveryChance} Chance
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => onPreview(file)}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full transition-colors"
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
