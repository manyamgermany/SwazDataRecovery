import React from 'react';
import { FileProgress, ReceivedFile, TransferStatus } from '../services/webrtcService';
import { ShieldCheckIcon, LinkIcon } from './icons/Icons';
import { formatBytes } from '../utils/formatters';

interface ReceiverViewProps {
    peerConnected: boolean;
    progress: Record<string, FileProgress>;
    receivedFiles: ReceivedFile[];
    status: TransferStatus;
    onCancelTransfer: () => void;
}

const ReceiverView: React.FC<ReceiverViewProps> = ({
    peerConnected, progress, receivedFiles, status, onCancelTransfer
}) => {

    const filesInProgress = Object.values(progress);
    const completedFilesMap = new Map(receivedFiles.map(f => [f.name, f]));

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
                            return (
                                <div key={p.fileId} className="p-2 bg-white dark:bg-gray-800 rounded text-left">
                                    {completedFile ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold truncate">{p.fileName}</p>
                                                <p className="text-xs text-green-500">Completed ({formatBytes(completedFile.size)})</p>
                                            </div>
                                            <a href={completedFile.url} download={completedFile.name} className="flex-shrink-0 ml-4 px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-md hover:bg-green-600">
                                                Download
                                            </a>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="font-semibold truncate">{p.fileName}</span>
                                                <span className="text-gray-500">{p.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                                <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${p.progress}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
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