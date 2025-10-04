import React from 'react';
import { formatBytes, formatEta } from '../utils/formatters';

type TransferStatus = 'transferring' | 'paused' | 'completed' | 'error' | 'idle';

interface TransferProgressProps {
    fileName?: string;
    transferredBytes: number;
    totalBytes: number;
    currentSpeed: number; // bytes/sec
    averageSpeed: number; // bytes/sec
    eta: number; // seconds
    status?: TransferStatus;
}

const TransferProgress: React.FC<TransferProgressProps> = ({
    fileName = 'Overall Progress',
    transferredBytes,
    totalBytes,
    currentSpeed,
    averageSpeed,
    eta,
    status = 'transferring',
}) => {
    const percentage = totalBytes > 0 ? (transferredBytes / totalBytes) * 100 : 0;

    const getStatusColor = () => {
        switch (status) {
            case 'completed':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'paused':
                return 'bg-yellow-500';
            default:
                return 'bg-accent';
        }
    };

    const progressBarId = `progress-bar-${fileName.replace(/\s+/g, '-')}`;
    const labelId = `label-${fileName.replace(/\s+/g, '-')}`;

    return (
        <div className="w-full bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span id={labelId} className="truncate">{fileName}</span>
                <span>{percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                <div
                    id={progressBarId}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-labelledby={labelId}
                    aria-valuetext={`${percentage.toFixed(1)}% complete`}
                    className={`h-4 rounded-full transition-all duration-300 ${getStatusColor()}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                <div>
                    <p className="font-semibold">Transferred</p>
                    <p>{formatBytes(transferredBytes)} / {formatBytes(totalBytes)}</p>
                </div>
                <div>
                    <p className="font-semibold">Current Speed</p>
                    <p>{formatBytes(currentSpeed)}/s</p>
                </div>
                <div>
                    <p className="font-semibold">Avg. Speed</p>
                    <p>{formatBytes(averageSpeed)}/s</p>
                </div>
                <div>
                    <p className="font-semibold">ETA</p>
                    <p>{formatEta(eta)}</p>
                </div>
            </div>
        </div>
    );
};

export default TransferProgress;
