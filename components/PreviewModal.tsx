

import React, { useEffect, useState } from 'react';
import { RecoveredFile, FileType } from '../types';
import { analyzeFileContent } from '../services/geminiService';
import { CloseIcon } from './icons/Icons';
import { formatBytes } from '../utils/formatters';

interface PreviewModalProps {
  file: RecoveredFile;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose }) => {
  const [analysis, setAnalysis] = useState<string>('Analyzing with Gemini...');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const getAnalysis = async () => {
      setIsLoading(true);
      const result = await analyzeFileContent(file);
      setAnalysis(result);
      setIsLoading(false);
    };

    getAnalysis();
  }, [file]);
  
  // Close modal on escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div 
        className="bg-background-light dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="preview-title" className="text-xl font-bold truncate">{file.name}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">File Details</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <strong className="text-gray-600 dark:text-gray-400">File Type:</strong>
                <span>{file.type}</span>
                <strong className="text-gray-600 dark:text-gray-400">Size:</strong>
                <span>{formatBytes(file.size)}</span>
                <strong className="text-gray-600 dark:text-gray-400">Recovery Chance:</strong>
                <span>{file.recoveryChance}</span>
                <strong className="text-gray-600 dark:text-gray-400">Original Path:</strong>
                <span className="truncate">{file.path}</span>
            </div>
          </div>

          {file.type === FileType.Image && file.previewUrl && (
            <div className="mt-4">
               <h3 className="font-semibold text-lg mb-2">Image Preview</h3>
              <div className="mb-4">
                <img src={file.previewUrl} alt={`Preview of ${file.name}`} className="rounded-lg w-full h-auto object-contain max-h-60" />
              </div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold text-lg mb-2">Gemini File Analysis</h3>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm min-h-[80px]">
                {isLoading ? (
                    <div className="flex items-center space-x-2 text-gray-500">
                        <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-accent"></div>
                        <span>Analyzing...</span>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{analysis}</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;