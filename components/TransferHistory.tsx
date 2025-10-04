import React, { useState } from 'react';
import { TransferHistoryEntry } from '../types';
import { formatBytes } from '../utils/formatters';
import { ChevronDownIcon, HistoryIcon, TrashIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, XCircleIcon } from './icons/Icons';

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

const TransferHistory: React.FC<TransferHistoryProps> = ({ history, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!history || history.length === 0) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-center p-4"
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center gap-3">
                        <HistoryIcon className="w-6 h-6 text-accent" />
                        <h2 className="text-xl font-bold">Transfer History</h2>
                    </div>
                    <ChevronDownIcon className={`w-6 h-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] ' : 'max-h-0'}`}>
                   <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {history.length > 0 ? (
                         <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                             {history.map(entry => (
                                 <div key={entry.id} className="grid grid-cols-[auto,1fr,auto,auto] items-center gap-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                     <StatusIcon status={entry.status} />
                                     <div>
                                         <p className="font-semibold truncate">{entry.fileName}</p>
                                         <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(entry.date).toLocaleString()}</p>
                                     </div>
                                     <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatBytes(entry.fileSize)}</p>
                                     <p className={`text-sm font-bold ${
                                         entry.status === 'Sent' ? 'text-blue-500' :
                                         entry.status === 'Received' ? 'text-green-500' : 'text-red-500'
                                     }`}>{entry.status}</p>
                                 </div>
                             ))}
                         </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">No transfer history yet.</p>
                    )}
                     <div className="mt-4 flex justify-end">
                        <button onClick={onClear} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-500/10 text-red-500 font-semibold rounded-lg hover:bg-red-500/20">
                           <TrashIcon className="w-5 h-5"/> Clear History
                        </button>
                    </div>
                   </div>
                </div>
            </div>
        </div>
    );
};

export default TransferHistory;
