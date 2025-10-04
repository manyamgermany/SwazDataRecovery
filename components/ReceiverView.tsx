import React, { useState, useEffect } from 'react';
import { FileProgress, ReceivedFile, TransferStatus } from '../services/webrtcService';
import { ShieldCheckIcon, LinkIcon, DocumentIcon, ImageIcon, VideoIcon, AudioIcon, ClockIcon } from './icons/Icons';
import { formatBytes } from '../utils/formatters';

interface ReceiverViewProps {
    peerConnected: boolean;
    progress: Record<string, FileProgress>;
    receivedFiles: ReceivedFile[];
    status: TransferStatus;
    onCancelTransfer: () => void;
    scheduledTime: number | null;
}

const Countdown: React.FC<{ to: number }> = ({ to }) => {
    const [timeLeft, setTimeLeft] = useState(to - Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = to - Date.now();
            if (remaining <= 0) {
                clearInterval(timer);
            }
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(timer);
    }, [to]);

    if (timeLeft <= 0) {
        return <p className="text-xl font-semibold text-accent mt-2">Waiting for sender to start...</p>;
    }

    const seconds = Math.floor((timeLeft / 1000) % 60);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    return (
        <div className="flex items-baseline justify-center gap-2">
             <span className="text-3xl font-bold text-accent">
                {days > 0 && `${days}d `}
                {hours.toString().padStart(2, '0')}:
                {minutes.toString().padStart(2, '0')}:
                {seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

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

const ReceivingFileProgressItem: React.FC<{progress: FileProgress}> = ({ progress }) => {
    const { fileName, fileSize, fileType, progress: percent, transferredChunks, totalChunks } = progress;
    return (
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-left shadow-sm">
            <div className="flex items-center gap-3">
                {getFileTypeIcon(fileType)}
                <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-baseline text-sm">
                        <span className="font-semibold truncate pr-2" title={fileName}>{fileName}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatBytes(fileSize)}</span>
                    </div>
                     <div className="flex justify-between items-baseline text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>
                           Chunks: {transferredChunks} / {totalChunks > 0 ? totalChunks : '?'}
                        </span>
                        <span className="font-medium">{percent}%</span>
                    </div>
                    <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReceiverView: React.FC<ReceiverViewProps> = ({
    peerConnected, progress, receivedFiles, onCancelTransfer, scheduledTime
}) => {

    const filesInProgress = Object.values(progress);
    const completedFilesMap = new Map(receivedFiles.map(f => [f.name, f]));

    if (scheduledTime && Date.now() < scheduledTime && filesInProgress.length === 0) {
        return (
            <div className="w-full max-w-2xl text-center">
                 <div className="p-8 bg-gray-100 dark:bg-gray-900 rounded-xl">
                    <ClockIcon className="w-16 h-16 text-accent mx-auto mb-4" />
                    <h3 className="text-2xl font-bold">Waiting for Scheduled Transfer</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">
                        The transfer is scheduled to begin in:
                    </p>
                    <Countdown to={scheduledTime} />
                    <p className="text-sm text-gray-500 mt-2">
                        Please keep this page open. The transfer will start automatically.
                    </p>
                     <div className="mt-6">
                        <button onClick={onCancelTransfer} className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600">
                           Cancel
                        </button>
                    </div>
                 </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                {peerConnected ? <ShieldCheckIcon className="w-6 h-6 text-green-500 animate-pulse" /> : <LinkIcon className={`w-6 h-6 text-red-500`} />}
                <h3 className="text-2xl font-bold">{peerConnected ? 'Secure Connection Established' : 'Connecting...'}</h3>
            </div>

            <div className="w-full bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                <h4 className="font-bold text-lg mb-2 text-center">Receiving Files</h4>
                <div className="space-y-3 max-h-80 overflow-y-auto p-3 border-y border-gray-200 dark:border-gray-700">
                    {filesInProgress.length > 0 ? (
                        filesInProgress.map(p => {
                            const completedFile = completedFilesMap.get(p.fileName);
                            if (completedFile) {
                               return (
                                <div key={p.fileId} className="p-3 bg-white dark:bg-gray-800 rounded-lg text-left shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {getFileTypeIcon(completedFile.type)}
                                            <div className="truncate">
                                                <p className="font-semibold truncate">{p.fileName}</p>
                                                <p className="text-xs text-green-500">Completed ({formatBytes(completedFile.size)})</p>
                                            </div>
                                        </div>
                                        <a href={completedFile.url} download={completedFile.name} className="flex-shrink-0 ml-4 px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600">
                                            Download
                                        </a>
                                    </div>
                                </div>
                               );
                            }
                            return <ReceivingFileProgressItem key={p.fileId} progress={p} />;
                        })
                    ) : (
                         <p className="text-center text-gray-500 py-8">Waiting to receive files from sender...</p>
                    )}
                </div>
                 <div className="flex items-center justify-center gap-4 mt-4">
                    <button onClick={onCancelTransfer} className="px-6 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiverView;