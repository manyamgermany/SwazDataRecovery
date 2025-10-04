import React from 'react';
import { formatBytes, formatEta } from '../utils/formatters';

type TransferStatus = 'transferring' | 'paused' | 'completed' | 'error' | 'idle';

interface SpeedChartProps {
    data: number[];
    width?: number;
    height?: number;
}

const SpeedChart: React.FC<SpeedChartProps> = ({ data, width = 300, height = 60 }) => {
    if (!data || data.length < 2) {
        return <div style={{width, height}} className="flex items-center justify-center text-xs text-gray-400">Awaiting speed data...</div>;
    }
    const maxSpeed = Math.max(...data, 1); // Avoid division by zero
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / maxSpeed) * (height - 2)}`).join(' ');

    return (
        <div className="mt-2">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                 <defs>
                    <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0"/>
                    </linearGradient>
                </defs>
                <polyline fill="none" stroke="var(--color-accent, #457B9D)" strokeWidth="2" points={points} />
                <polygon fill="url(#speedGradient)" points={`0,${height} ${points} ${width},${height}`} />
            </svg>
            <div className="flex justify-between text-xs text-gray-400 -mt-2">
                <span>0 B/s</span>
                <span>{formatBytes(maxSpeed)}/s</span>
            </div>
        </div>
    );
};

interface TransferProgressProps {
    fileName?: string;
    transferredBytes: number;
    totalBytes: number;
    currentSpeed: number; // bytes/sec
    averageSpeed: number; // bytes/sec
    eta: number; // seconds
    status?: TransferStatus;
    speedData?: number[];
}

const TransferProgress: React.FC<TransferProgressProps> = ({
    fileName = 'Overall Progress',
    transferredBytes,
    totalBytes,
    currentSpeed,
    averageSpeed,
    eta,
    status = 'transferring',
    speedData = [],
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
            
            {/* Main stats - More prominent display */}
            <div className="flex justify-around items-baseline mt-4 text-center">
                <div className="w-1/2">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Speed</p>
                    <p className="text-2xl font-bold text-accent">{formatBytes(currentSpeed)}/s</p>
                </div>
                <div className="w-1/2">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ETA</p>
                    <p className="text-2xl font-bold text-accent">{formatEta(eta)}</p>
                </div>
            </div>

            {/* Secondary stats */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-2">
                <span>Transferred: {formatBytes(transferredBytes)} / {formatBytes(totalBytes)}</span>
                <span>Avg: {formatBytes(averageSpeed)}/s</span>
            </div>

            {status === 'transferring' && <SpeedChart data={speedData} />}
        </div>
    );
};

export default TransferProgress;