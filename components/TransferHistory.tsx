import React, { useState } from 'react';
import { TransferHistoryEntry } from '../types';
import { formatBytes } from '../utils/formatters';
import { 
    ChevronDownIcon, 
    HistoryIcon, 
    TrashIcon, 
    ArrowUpCircleIcon, 
    ArrowDownCircleIcon, 
    XCircleIcon,
    DocumentIcon,
    ImageIcon,
    VideoIcon,
    AudioIcon,
} from './icons/Icons';

interface TransferHistoryProps {
    history: TransferHistoryEntry[];
    onClear: () => void;
}

const StatusIcon: React.FC<{ status: TransferHistoryEntry['status'] }> = ({ status }) => {
    switch (status) {
        case 'Sent':
            return <ArrowUpCircleIcon className="w-6 h-6 text-blue-500" />;
        case 'Received':
            return <ArrowDownCircleIcon className="w-6 h-6 text-green-500" />;
        case 'Canceled':
            return <XCircleIcon className="w-6 h-6 text-red-500" />;
        default:
            return null;
    }
}

const getFileTypeIcon = (mimeType: string) => {
    const commonClasses = "w-6 h-6 flex-shrink-0 text-accent";
    if (!mimeType) return <DocumentIcon className={commonClasses} />;
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


const TransferHistory: React.FC<TransferHistoryProps> = ({ history, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const formatDuration = (seconds: number) => {
        if (seconds < 1) return '< 1s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [ h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', s > 0 ? `${s}s` : '' ].filter(Boolean).join(' ') || '0s';
    };

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <div className="w-full flex justify-between items-center p-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-3 flex-grow text-left"
                        aria-expanded={isOpen}
                        aria-controls="transfer-history-content"
                    >
                        <HistoryIcon className="w-6 h-6 text-accent" />
                        <h2 className="text-xl font-bold">Transfer History</h2>
                        <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {history.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{history.length}</span>
                             <button 
                                onClick={onClear} 
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                aria-label="Clear transfer history"
                            >
                                <TrashIcon className="w-4 h-4"/>
                                <span>Clear</span>
                            </button>
                        </div>
                    )}
                </div>
                <div id="transfer-history-content" className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] ' : 'max-h-0'}`}>
                   <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                    {history.length > 0 ? (
                         <div className="space-y-2 max-h-[400px] overflow-y-auto pt-4 pr-2">
                             {history.map(entry => (
                                 <div key={entry.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                     <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="w-full grid grid-cols-[auto,1fr,auto,auto] sm:grid-cols-[auto,1fr,auto,auto,auto] items-center gap-x-3 p-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-md">
                                         <StatusIcon status={entry.status} />
                                         <div className="flex items-center gap-3 min-w-0">
                                            {getFileTypeIcon(entry.fileType)}
                                            <div className="truncate">
                                                <p className="font-semibold truncate" title={entry.fileName}>{entry.fileName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{new Date(entry.date).toLocaleDateString()}</span>
                                                    <span className="hidden sm:inline"> {new Date(entry.date).toLocaleTimeString()}</span>
                                                    <span className="sm:hidden"> &middot; {formatBytes(entry.fileSize)}</span>
                                                </p>
                                            </div>
                                         </div>
                                         <p className="text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:block">{formatBytes(entry.fileSize)}</p>
                                         <p className={`text-sm font-bold text-center ${
                                             entry.status === 'Sent' ? 'text-blue-500' :
                                             entry.status === 'Received' ? 'text-green-500' : 'text-red-500'
                                         }`}>{entry.status}</p>
                                         <ChevronDownIcon className={`w-5 h-5 transition-transform text-gray-400 justify-self-end ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                                     </button>
                                     {expandedId === entry.id && (
                                         <div className="px-4 pb-3 ml-10 border-l-2 border-gray-200 dark:border-gray-600 animate-slide-in">
                                             {/* Use a grid for a cleaner, more organized layout of details */}
                                             <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2">
                                                 <strong className="font-semibold text-gray-600 dark:text-gray-300 text-right">Size:</strong>
                                                 <span>{formatBytes(entry.fileSize)}</span>

                                                 {entry.duration !== undefined && (
                                                     <>
                                                         <strong className="font-semibold text-gray-600 dark:text-gray-300 text-right">Duration:</strong>
                                                         <span>{formatDuration(entry.duration)}</span>
                                                     </>
                                                 )}

                                                 {entry.averageSpeed !== undefined && entry.status !== 'Canceled' && (
                                                     <>
                                                         <strong className="font-semibold text-gray-600 dark:text-gray-300 text-right">Avg. Speed:</strong>
                                                         <span>{formatBytes(entry.averageSpeed)}/s</span>
                                                     </>
                                                 )}

                                                 <strong className="font-semibold text-gray-600 dark:text-gray-300 text-right">File Type:</strong>
                                                 <span>{entry.fileType || 'N/A'}</span>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No transfer history yet.</p>
                    )}
                   </div>
                </div>
            </div>
        </div>
    );
};

export default TransferHistory;