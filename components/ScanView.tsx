import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Drive, RecoveredFile, FileType, AppStep } from '../types';
import { simulateFileRecovery } from '../services/mockData';
import FileItem from './FileItem';
import PreviewModal from './PreviewModal';
import { BackIcon } from './icons/Icons';

interface ScanViewProps {
  drive: Drive;
  onScanComplete: (files: RecoveredFile[]) => void;
  onScanError: (error: string) => void;
  onReset: () => void;
  recoveredFiles: RecoveredFile[];
  currentStep: AppStep;
}

const fileTypeFilters = Object.values(FileType);

const ScanView: React.FC<ScanViewProps> = ({ drive, onScanComplete, onScanError, onReset, recoveredFiles, currentStep }) => {
  const [progress, setProgress] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<FileType>>(new Set(fileTypeFilters));
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<RecoveredFile | null>(null);
  const [selectedForRecovery, setSelectedForRecovery] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentStep === AppStep.SCANNING) {
      let progressInterval: number;
      
      const startScan = async () => {
        try {
          // Simulate progress
          progressInterval = window.setInterval(() => {
            setProgress(prev => {
              if (prev >= 99) {
                clearInterval(progressInterval);
                return 99;
              }
              return prev + Math.random() * 5;
            });
          }, 200);

          const files = await simulateFileRecovery(drive);
          onScanComplete(files);
        } catch (err) {
            clearInterval(progressInterval);
            onScanError("An error occurred during the scan simulation.");
        }
      };

      startScan();

      return () => {
        clearInterval(progressInterval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, drive, onScanComplete, onScanError]);
  
  const toggleFilter = useCallback((filter: FileType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(filter)) {
        newFilters.delete(filter);
      } else {
        newFilters.add(filter);
      }
      return newFilters;
    });
  }, []);

  const toggleSelectFile = useCallback((fileId: string) => {
    setSelectedForRecovery(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
        } else {
            newSelection.add(fileId);
        }
        return newSelection;
    });
  }, []);

  const filteredFiles = useMemo(() => {
    return recoveredFiles.filter(file => activeFilters.has(file.type));
  }, [recoveredFiles, activeFilters]);
  
  const selectAll = useCallback(() => {
    if(selectedForRecovery.size === filteredFiles.length) {
        setSelectedForRecovery(new Set());
    } else {
        setSelectedForRecovery(new Set(filteredFiles.map(f => f.id)));
    }
  }, [filteredFiles, selectedForRecovery.size]);
  
  if (currentStep === AppStep.SCANNING) {
    return (
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Scanning {drive.name}...</h2>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8">
          <div
            className="bg-primary-light h-8 rounded-full transition-all duration-500 ease-out text-white flex items-center justify-center font-bold"
            style={{ width: `${progress}%` }}
          >
            {Math.round(progress)}%
          </div>
        </div>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 animate-pulse-fast">Searching for recoverable files...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-in">
        <button onClick={onReset} className="flex items-center space-x-2 text-accent font-semibold hover:underline mb-4">
            <BackIcon className="w-5 h-5" />
            <span>Start New Scan</span>
        </button>
      <h2 className="text-3xl font-bold mb-2">Scan Results for {drive.name}</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">{recoveredFiles.length} files found. {filteredFiles.length} shown.</p>
      
      <div className="mb-6 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg sticky top-[68px] z-40">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold mr-2">Filter by type:</span>
          {fileTypeFilters.map(filter => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${activeFilters.has(filter) ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

       <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div>
            <input 
                type="checkbox"
                id="select-all"
                className="w-5 h-5 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent dark:focus:ring-accent dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                onChange={selectAll}
                checked={selectedForRecovery.size > 0 && selectedForRecovery.size === filteredFiles.length}
            />
            <label htmlFor="select-all" className="ml-2 font-medium text-text-light dark:text-text-dark">Select All Visible</label>
        </div>
        <div className="flex items-center gap-4">
            <button className="px-6 py-2 bg-primary-light text-white font-semibold rounded-lg shadow-md hover:bg-secondary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={selectedForRecovery.size === 0}>
                Recover {selectedForRecovery.size} file(s)
            </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredFiles.length > 0 ? filteredFiles.map(file => (
          <FileItem 
            key={file.id} 
            file={file} 
            onPreview={() => setSelectedFileForPreview(file)}
            onSelectToggle={toggleSelectFile}
            isSelected={selectedForRecovery.has(file.id)}
            />
        )) : (
            <div className="text-center py-12">
                <p className="text-xl text-gray-500">No files match the current filters.</p>
            </div>
        )}
      </div>

      {selectedFileForPreview && (
        <PreviewModal file={selectedFileForPreview} onClose={() => setSelectedFileForPreview(null)} />
      )}
    </div>
  );
};

export default ScanView;