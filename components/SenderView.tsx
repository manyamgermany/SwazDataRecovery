import React, { useState, useCallback, useMemo } from 'react';
import { FileProgress, TransferStatus } from '../services/webrtcService';
import { TransferState } from './FileTransferPage';
import { formatBytes } from '../utils/formatters';
import { 
    UploadCloudIcon, 
    DocumentIcon, 
    XCircleIcon, 
    CopyIcon, 
    CheckIcon, 
    ShieldCheckIcon, 
    PauseIcon, 
    PlayIcon, 
    LinkIcon,
    ImageIcon,
    VideoIcon,
    AudioIcon,
    CalendarIcon,
    TrashIcon,
    CloseIcon,
    QrCodeIcon,
} from './icons/Icons';
import TransferProgress from './TransferProgress';
import { P2PTransferModal } from './P2PTransferModal';

interface SenderViewProps {
    roomId: string;
    peerConnected: boolean;
    onStartTransfer: (files: File[]) => void;
    onScheduleTransfer: (time: number, files: File[]) => void;
    onPauseTransfer: () => void;
    onResumeTransfer: () => void;
    onCancelTransfer: () => void;
    onCancelSchedule: () => void;
    files: File[];
    progress: Record<string, FileProgress>;
    transferState: TransferState;
    transferSpeed: number;
    averageSpeed: number;
    eta: number;
    status: TransferStatus;
    scheduledTime: number | null;
    speedData: number[];
}

// Helper to recursively read files from a dropped directory
async function getFilesInDirectory(entry: FileSystemDirectoryEntry): Promise<File[]> {
    const reader = entry.createReader();
    // Read entries in batches until all are read
    let allEntries: FileSystemEntry[] = [];
    let currentEntries: FileSystemEntry[] = [];
    do {
        currentEntries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
        });
        allEntries = allEntries.concat(currentEntries);
    } while (currentEntries.length > 0);


    const files = await Promise.all(
        allEntries.map((innerEntry) => {
            if (innerEntry.isFile) {
                return new Promise<File>((resolveFile, rejectFile) => (innerEntry as FileSystemFileEntry).file(resolveFile, rejectFile));
            }
            if (innerEntry.isDirectory) {
                return getFilesInDirectory(innerEntry as FileSystemDirectoryEntry);
            }
            return Promise.resolve([]);
        })
    );
    // Use `flat()` to flatten the array of arrays
    return files.flat();
}

const getFileTypeIcon = (mimeType: string) => {
    const commonClasses = "w-8 h-8 flex-shrink-0 text-accent";
    if (mimeType.startsWith('image/')) {
        return <ImageIcon className={commonClasses} />;
    }
    if (mimeType.startsWith('video/')) {
        return <VideoIcon className={commonClasses} />;
    }
    if (mimeType.startsWith('audio/')) {
        return <AudioIcon className={commonClasses} />;
    }
    return <DocumentIcon className={commonClasses} />;
};

const FileDropzone: React.FC<{onFilesSelected: (files: File[]) => void}> = ({ onFilesSelected }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        const droppedFiles: File[] = [];
        const promises: Promise<File | File[] | null>[] = [];
    
        // dataTransfer.items is the modern API, check for it
        if (e.dataTransfer.items) {
             for (const item of e.dataTransfer.items) {
                // webkitGetAsEntry() is non-standard but the only way to get folder drag-and-drop.
                // It is supported in Chrome and Edge. We check for its existence for cross-browser safety.
                if (typeof item.webkitGetAsEntry === 'function') {
                    const entry = item.webkitGetAsEntry();
                    if (entry) {
                        if (entry.isDirectory) {
                            promises.push(getFilesInDirectory(entry as FileSystemDirectoryEntry));
                        } else if (entry.isFile) {
                            promises.push(new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)));
                        }
                    }
                } else {
                    // Fallback for Firefox and other browsers that support .items but not .webkitGetAsEntry.
                    // This will handle file drops correctly.
                    const file = item.getAsFile();
                    if (file) {
                        promises.push(Promise.resolve(file));
                    }
                }
            }
            const results = await Promise.all(promises);
            results.flat().forEach(file => file && droppedFiles.push(file as File));
        } else {
            // Fallback for older browsers that only support e.dataTransfer.files
             droppedFiles.push(...Array.from(e.dataTransfer.files));
        }
        
        if (droppedFiles.length > 0) {
            onFilesSelected(droppedFiles);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };
    
    // Add webkitdirectory attribute to allow folder selection
    const handleFolderSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute('webkitdirectory', 'true');
            fileInputRef.current.click();
        }
    };
    
    const handleFileSelect = () => {
        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute('webkitdirectory');
            fileInputRef.current.click();
        }
    };

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full relative flex flex-col items-center justify-center p-8 border-4 border-dashed rounded-xl transition-colors
                ${isDragActive ? 'border-accent bg-accent/10' : 'border-gray-300 dark:border-gray-600'}`}
        >
            <div className="text-center">
                 <UploadCloudIcon className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                <p className="text-xl font-semibold text-text-light dark:text-text-dark">Drag & drop files or folders here</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">or select manually</p>
                <div className="mt-4 flex gap-4 justify-center">
                    <button type="button" onClick={handleFileSelect} className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors">Select Files</button>
                    <button type="button" onClick={handleFolderSelect} className="px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors">Select Folder</button>
                </div>
                <input id="file-upload" ref={fileInputRef} type="file" multiple className="hidden" onChange={handleChange} />
            </div>
        </div>
    );
};

const ScheduleTransferModal: React.FC<{ onConfirm: (time: number) => void; onClose: () => void; }> = ({ onConfirm, onClose }) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Default to 5 mins in the future
    now.setSeconds(0);
    const minDateTime = now.toISOString().slice(0, 16);
    const [scheduledTime, setScheduledTime] = useState(minDateTime);

    const handleConfirm = () => {
        const selectedDate = new Date(scheduledTime);
        if (selectedDate > new Date()) {
            onConfirm(selectedDate.getTime());
        }
    };

    return (
         <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" 
            onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="schedule-title"
        >
             <div className="bg-background-light dark:bg-background-dark rounded-xl shadow-2xl w-full max-w-sm animate-slide-in" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 id="schedule-title" className="text-xl font-bold">Schedule Transfer</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-6 space-y-4">
                    <p>Select a future date and time to start the transfer automatically.</p>
                    <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        min={minDateTime}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                    <div className="flex justify-end gap-3">
                         <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                         <button onClick={handleConfirm} className="px-4 py-2 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light">Confirm</button>
                    </div>
                </div>
             </div>
        </div>
    );
};

const FileProgressItem: React.FC<{file: File, progress: FileProgress | undefined}> = ({ file, progress }) => {
    const { name, size, type } = file;
    const { progress: percent = 0, transferredChunks = 0, totalChunks = 0 } = progress || {};

    return (
        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
                {getFileTypeIcon(type)}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline text-sm">
                        <span className="font-semibold truncate pr-2" title={name}>{name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatBytes(size)}</span>
                    </div>
                     <div className="flex justify-between items-baseline text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>
                           Chunks: {transferredChunks} / {totalChunks > 0 ? totalChunks : '?'}
                        </span>
                        <span className="font-medium">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div className="bg-primary-light h-2 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const SenderView: React.FC<SenderViewProps> = ({
    roomId, peerConnected, onStartTransfer, onScheduleTransfer, onPauseTransfer, onResumeTransfer, onCancelTransfer, onCancelSchedule,
    files, progress, transferState, transferSpeed, averageSpeed, eta, scheduledTime, speedData
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isCopied, setIsCopied] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        const uniqueNewFiles = newFiles.filter(newFile => 
            !selectedFiles.some(existingFile => 
                existingFile.name === newFile.name && 
                existingFile.size === newFile.size && 
                existingFile.lastModified === newFile.lastModified
            )
        );
        setSelectedFiles(prev => [...prev, ...uniqueNewFiles]);
    }, [selectedFiles]);

    const handleRemoveFile = (indexToRemove: number) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleClearAll = () => setSelectedFiles([]);

    const handleStart = () => {
        if (selectedFiles.length > 0) {
            onStartTransfer(selectedFiles);
        }
    };
    
    const handleScheduleConfirm = (time: number) => {
        if (selectedFiles.length > 0) {
            onScheduleTransfer(time, selectedFiles);
        }
        setIsScheduling(false);
    };

    const shareableLink = `${window.location.origin}${window.location.pathname}?join=${roomId}`;

    const handleCopyToClipboard = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(shareableLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);
    const totalSelectedSize = useMemo(() => selectedFiles.reduce((sum, f) => sum + f.size, 0), [selectedFiles]);

    const totalTransferred = useMemo(() => {
        return Object.values(progress).reduce((sum, p) => {
            const file = files.find(f => f.name === p.fileName);
            return sum + ((file?.size || 0) * p.progress) / 100;
        }, 0);
    }, [progress, files]);

    if (transferState === 'idle') {
        return (
            <div className="w-full max-w-lg text-center">
                {isScheduling && <ScheduleTransferModal onConfirm={handleScheduleConfirm} onClose={() => setIsScheduling(false)} />}
                <FileDropzone onFilesSelected={handleFilesSelected} />
                {selectedFiles.length > 0 && (
                    <div className="mt-6 w-full text-left animate-slide-in">
                        <div className="flex justify-between items-center mb-2">
                             <h3 className="font-bold text-lg">Files to Send</h3>
                             <button onClick={handleClearAll} className="flex items-center gap-1 px-2 py-1 text-sm text-red-500 hover:bg-red-500/10 rounded-md">
                                <TrashIcon className="w-4 h-4" /> Clear All
                            </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                            {selectedFiles.map((file, index) => (
                                <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                    <div className="flex items-center gap-3 truncate min-w-0">
                                        {getFileTypeIcon(file.type)}
                                        <div className="truncate">
                                            <span className="truncate text-sm font-semibold text-text-light dark:text-text-dark" title={file.name}>{file.name}</span>
                                            <span className="text-xs text-gray-500 block">{formatBytes(file.size)}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFile(index)}
                                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0 ml-2"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <XCircleIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400 px-1">
                           <p>Total files: <span className="font-bold text-text-light dark:text-text-dark">{selectedFiles.length}</span></p>
                           <p>Total size: <span className="font-bold text-text-light dark:text-text-dark">{formatBytes(totalSelectedSize)}</span></p>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-3">
                             <button onClick={() => setIsScheduling(true)} className="w-full px-4 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-opacity-80 transition-colors flex items-center justify-center gap-2">
                                <CalendarIcon className="w-5 h-5"/> Schedule
                            </button>
                            <button onClick={handleStart} className="w-full px-4 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-colors">
                               Create Secure Room & Send
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl text-center">
            {isShareModalOpen && roomId && <P2PTransferModal shareableLink={shareableLink} onClose={() => setIsShareModalOpen(false)} />}
             <div className="flex items-center justify-center gap-2 mb-2">
                {peerConnected ? <ShieldCheckIcon className="w-6 h-6 text-green-500 animate-pulse"/> : <LinkIcon className="w-6 h-6 text-red-500"/>}
                <h3 className="text-2xl font-bold">{peerConnected ? 'Secure Connection Established' : 'Waiting for Peer...' }</h3>
            </div>
            
            {!peerConnected && roomId && (
                 <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <p className="text-gray-600 dark:text-gray-400 mb-3">Share this link with the receiver:</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text" 
                            readOnly 
                            value={shareableLink} 
                            className="w-full flex-grow px-3 py-2 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 text-sm truncate"
                        />
                         <button onClick={handleCopyToClipboard} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors">
                           {isCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                           {isCopied ? 'Copied!' : 'Copy Link'}
                        </button>
                        <button onClick={() => setIsShareModalOpen(true)} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors">
                           <QrCodeIcon className="w-5 h-5" />
                           Show QR
                        </button>
                    </div>
                </div>
            )}
            
            {scheduledTime && (
                <div className="p-3 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-lg mb-4 text-center">
                    <p className="font-semibold">Transfer scheduled for {new Date(scheduledTime).toLocaleString()}</p>
                    <button onClick={onCancelSchedule} className="text-sm underline hover:text-blue-500">Cancel Schedule</button>
                </div>
            )}

            <TransferProgress
                fileName="Overall Progress"
                transferredBytes={totalTransferred}
                totalBytes={totalSize}
                currentSpeed={transferSpeed}
                averageSpeed={averageSpeed}
                eta={eta}
                status={transferState === 'done' ? 'completed' : transferState === 'connecting' ? 'transferring' : transferState}
                speedData={speedData}
            />

            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border-y border-gray-200 dark:border-gray-700 mt-4">
                {files.map((file) => {
                    const currentProgress = Object.values(progress).find(p => p.fileName === file.name);
                    return (
                        <FileProgressItem key={`${file.name}-${file.lastModified}`} file={file} progress={currentProgress} />
                    )
                })}
            </div>
            
            <div className="flex items-center justify-center gap-4 mt-4">
                {transferState === 'transferring' && (
                    <button onClick={onPauseTransfer} className="px-6 py-2 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 flex items-center gap-2">
                       <PauseIcon className="w-5 h-5"/> Pause
                    </button>
                )}
                {transferState === 'paused' && (
                     <button onClick={onResumeTransfer} className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 flex items-center gap-2">
                       <PlayIcon className="w-5 h-5"/> Resume
                    </button>
                )}
                <button onClick={onCancelTransfer} className="px-6 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default SenderView;