import React, { useState, useCallback, useMemo } from 'react';
import { FileProgress, TransferStatus } from '../services/webrtcService';
import { TransferState } from './FileTransferPage';
import { formatBytes } from '../utils/formatters';
import { UploadCloudIcon, DocumentIcon, XCircleIcon, CopyIcon, CheckIcon, ShieldCheckIcon, PauseIcon, PlayIcon, LinkIcon } from './icons/Icons';
import TransferProgress from './TransferProgress';

interface SenderViewProps {
    roomId: string;
    peerConnected: boolean;
    onStartTransfer: (files: File[]) => void;
    onPauseTransfer: () => void;
    onResumeTransfer: () => void;
    onCancelTransfer: () => void;
    files: File[];
    progress: Record<string, FileProgress>;
    transferState: TransferState;
    transferSpeed: number;
    averageSpeed: number;
    eta: number;
    status: TransferStatus;
}

const FileDropzone: React.FC<{onFilesSelected: (files: File[]) => void}> = ({ onFilesSelected }) => {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <label
            htmlFor="file-upload"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center justify-center p-8 border-4 border-dashed rounded-xl cursor-pointer transition-colors
                ${isDragActive ? 'border-accent bg-accent/10' : 'border-gray-300 dark:border-gray-600 hover:border-accent/50'}`}
        >
            <UploadCloudIcon className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-xl font-semibold text-text-light dark:text-text-dark">Drag & drop files here</p>
            <p className="text-gray-500 dark:text-gray-400">or click to browse</p>
            <input id="file-upload" type="file" multiple className="hidden" onChange={handleChange} />
        </label>
    );
};

const SenderView: React.FC<SenderViewProps> = ({
    roomId, peerConnected, onStartTransfer, onPauseTransfer, onResumeTransfer, onCancelTransfer,
    files, progress, transferState, transferSpeed, averageSpeed, eta, status
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isCopied, setIsCopied] = useState(false);

    const handleFilesSelected = useCallback((newFiles: File[]) => {
        setSelectedFiles(prev => [...prev, ...newFiles]);
    }, []);

    const handleRemoveFile = (fileName: string) => {
        setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleStart = () => {
        if (selectedFiles.length > 0) {
            onStartTransfer(selectedFiles);
        }
    };

    const handleCopyToClipboard = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);
    const totalTransferred = useMemo(() => {
        return Object.values(progress).reduce((sum, p) => {
            const file = files.find(f => f.name === p.fileName);
            return sum + ((file?.size || 0) * p.progress) / 100;
        }, 0);
    }, [progress, files]);

    if (transferState === 'idle' || (transferState === 'transferring' && files.length === 0)) {
        return (
            <div className="w-full max-w-lg text-center">
                <FileDropzone onFilesSelected={handleFilesSelected} />
                {selectedFiles.length > 0 && (
                    <div className="mt-6 w-full text-left">
                        <h3 className="font-bold mb-2">Selected Files:</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded-md">
                            {selectedFiles.map(file => (
                                <div key={file.name} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                    <div className="flex items-center gap-2 truncate">
                                        <DocumentIcon className="w-5 h-5 flex-shrink-0 text-accent"/>
                                        <span className="truncate text-sm">{file.name}</span>
                                        <span className="text-xs text-gray-500 flex-shrink-0">({formatBytes(file.size)})</span>
                                    </div>
                                    <button onClick={() => handleRemoveFile(file.name)}>
                                        <XCircleIcon className="w-5 h-5 text-gray-400 hover:text-red-500"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleStart} className="mt-4 w-full px-6 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-colors">
                           {`Create Secure Room & Send ${selectedFiles.length} File(s)`}
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-2xl text-center">
             <div className="flex items-center justify-center gap-2 mb-2">
                {peerConnected ? <ShieldCheckIcon className="w-6 h-6 text-green-500 animate-pulse"/> : <LinkIcon className="w-6 h-6 text-red-500"/>}
                <h3 className="text-2xl font-bold">{peerConnected ? 'Secure Connection Established' : 'Waiting for Peer...' }</h3>
            </div>
            
            {!peerConnected && roomId && (
                <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Share this Room ID with the receiver:</p>
                     <button onClick={handleCopyToClipboard} className="w-full flex items-center justify-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors group">
                        <span className="font-mono text-2xl font-bold text-accent tracking-widest">{roomId}</span>
                        <div className="relative w-6 h-6">{isCopied ? <CheckIcon className="w-6 h-6 text-green-500" /> : <CopyIcon className="w-6 h-6" />}</div>
                    </button>
                </div>
            )}

            <TransferProgress
                fileName="Overall Progress"
                transferredBytes={totalTransferred}
                totalBytes={totalSize}
                currentSpeed={transferSpeed}
                averageSpeed={averageSpeed}
                eta={eta}
                status={transferState === 'done' ? 'completed' : transferState}
            />

            <div className="space-y-2 max-h-48 overflow-y-auto p-2 border-y border-gray-200 dark:border-gray-700 mt-4">
                {files.map((file) => {
                    const currentProgress = Object.values(progress).find(p => p.fileName === file.name);
                    return (
                         <div key={file.name}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="font-semibold truncate">{file.name}</span>
                                <span className="text-gray-500">{currentProgress?.progress ?? 0}%</span>
                            </div>
                            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-primary-light h-2 rounded-full transition-all" style={{ width: `${currentProgress?.progress ?? 0}%` }}></div>
                            </div>
                        </div>
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