import React, { useState, useEffect, useRef } from 'react';
import { WebRTCConnectionManager, ConnectionState } from '../services/WebRTCConnectionManager';
import { FileTransferManager, TransferStatus, FileProgress, ReceivedFile } from '../services/webrtcService';
import { EncryptionPipeline } from '../services/EncryptionPipeline';
import SenderView from './SenderView';
import ReceiverView from './ReceiverView';
import { LinkIcon, ShareIcon } from './icons/Icons';
import { TransferHistoryEntry } from '../types';
import { getHistory, addHistoryEntry, clearHistory } from '../utils/history';
import { saveScheduledJob, getScheduledJob, clearScheduledJob } from '../utils/scheduledTransferDB';
import TransferHistory from './TransferHistory';
import ErrorNotificationModal from './ErrorNotificationModal';

const getSignalingServerUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Construct the URL using the current page's hostname and port 8080.
  // This is more robust for cloud development environments than 'localhost'.
  const host = window.location.hostname;
  return `${protocol}://${host}:8080`;
};

const SIGNALING_SERVER_URL = getSignalingServerUrl();
const ICE_SERVERS = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
]};

export type TransferState = 'idle' | 'connecting' | 'scheduled' | 'transferring' | 'paused' | 'done' | 'error';
type View = 'initial' | 'host' | 'receiver';

const FileTransferPage: React.FC = () => {
    const [view, setView] = useState<View>('initial');
    const [roomId, setRoomId] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [status, setStatusInternal] = useState<TransferStatus>({ type: 'info', message: 'Ready to connect.' });
    const [peerConnected, setPeerConnected] = useState(false);
    const [progress, setProgress] = useState<Record<string, FileProgress>>({});
    const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
    const [filesToSend, setFilesToSend] = useState<File[]>([]);
    
    const [transferState, setTransferState] = useState<TransferState>('idle');
    const [transferSpeed, setTransferSpeed] = useState(0); // B/s
    const [averageSpeed, setAverageSpeed] = useState(0); // B/s
    const [eta, setEta] = useState(0); // seconds
    const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
    const [scheduledTime, setScheduledTime] = useState<number | null>(null);

    const [history, setHistory] = useState<TransferHistoryEntry[]>(getHistory());
    const [speedDataPoints, setSpeedDataPoints] = useState<number[]>([]);
    const [errorDetails, setErrorDetails] = useState<{ title: string; message: string; suggestions: string[] } | null>(null);
    
    const ws = useRef<WebSocket | null>(null);
    const webRTCManager = useRef<WebRTCConnectionManager | null>(null);
    const fileManager = useRef<FileTransferManager | null>(null);
    const encryptionPipeline = useRef<EncryptionPipeline | null>(null);
    const isSender = useRef(false);
    const scheduleTimerId = useRef<number | null>(null);
    
    const progressHistory = useRef<{ time: number, bytes: number }[]>([]);
    const peerConnectedRef = useRef(peerConnected);

    useEffect(() => {
        peerConnectedRef.current = peerConnected;
    }, [peerConnected]);
    
    // Effect to check for persisted scheduled jobs on load
    useEffect(() => {
        const checkForScheduledJob = async () => {
            const job = await getScheduledJob();
            if (job) {
                const { files, scheduledTime: time, roomId: savedRoomId } = job;
                const now = Date.now();
                const timeRemaining = time - now;

                // If a job is scheduled for more than 5 minutes ago, consider it missed.
                if (timeRemaining < -5 * 60 * 1000) {
                    setStatusInternal({ type: 'error', message: `A scheduled transfer for ${new Date(time).toLocaleString()} was missed.` });
                    await clearScheduledJob();
                    return;
                }

                setStatusInternal({ type: 'info', message: 'Found a pending scheduled transfer.' });
                setFilesToSend(files);
                setScheduledTime(time);
                setRoomId(savedRoomId);
                setView('host');
                
                // Re-arm the schedule
                initializeModules();
                connectWebSocket(() => sendMessage('join-room', { roomId: savedRoomId }));
                setTransferState('scheduled');
                
                // If the time is in the past (but within the 5min grace period), it means the browser was closed.
                // We don't start immediately, but wait for the peer to connect. The peer connection logic will trigger the start.
                if (timeRemaining > 0) {
                     scheduleTimerId.current = window.setTimeout(startScheduledTransfer, timeRemaining);
                }
            }
        };
        checkForScheduledJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to handle joining a room via URL parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('join');
        const timeFromUrl = urlParams.get('at');
        if (roomIdFromUrl) {
            setJoinRoomId(roomIdFromUrl);
            if (timeFromUrl) {
                const scheduledTimeMs = parseInt(timeFromUrl, 10);
                if (scheduledTimeMs > Date.now()) {
                    setScheduledTime(scheduledTimeMs);
                }
            }
            // Automatically trigger the join process
            handleStartReceiving(roomIdFromUrl);
            // Optional: remove the query parameter from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            webRTCManager.current?.disconnect();
            ws.current?.close();
            if (scheduleTimerId.current) clearTimeout(scheduleTimerId.current);
        };
    }, []);

    useEffect(() => {
        if (transferState !== 'transferring') {
            if (transferState !== 'paused') {
                setAverageSpeed(0);
                setSpeedDataPoints([]);
            }
             setTransferSpeed(0);
            setEta(0);
            progressHistory.current = [];
            return;
        }

        const interval = setInterval(() => {
            const totalBytes = filesToSend.reduce((sum, f) => sum + f.size, 0);
            const transferredBytes = Object.values(progress).reduce((sum, p) => {
                const file = filesToSend.find(f => f.name === p.fileName);
                return sum + ((file?.size || 0) * p.progress) / 100;
            }, 0);

            const now = Date.now();
            if (!transferStartTime) {
                setTransferStartTime(now);
                progressHistory.current.push({ time: now, bytes: 0 });
                return;
            }

            progressHistory.current.push({ time: now, bytes: transferredBytes });
            progressHistory.current = progressHistory.current.filter(p => now - p.time < 5000); // 5-second window

            if (progressHistory.current.length > 1) {
                const first = progressHistory.current[0];
                const last = progressHistory.current[progressHistory.current.length - 1];
                const timeDiff = (last.time - first.time) / 1000;
                const bytesDiff = last.bytes - first.bytes;

                if (timeDiff > 0) {
                    const speed = bytesDiff / timeDiff;
                    setTransferSpeed(speed > 0 ? speed : 0);
                    setSpeedDataPoints(prev => [...prev, speed > 0 ? speed : 0].slice(-50));
                    const remainingBytes = totalBytes - transferredBytes;
                    setEta(speed > 0 ? remainingBytes / speed : 0);
                }
            }
            
            const totalTimeElapsed = (now - transferStartTime) / 1000;
            if (totalTimeElapsed > 0) {
                const avgSpeed = transferredBytes / totalTimeElapsed;
                setAverageSpeed(avgSpeed > 0 ? avgSpeed : 0);
            }
        }, 1000); // Calculate speed every second
        
        return () => clearInterval(interval);

    }, [progress, filesToSend, transferState, transferStartTime]);

    const handleError = (title: string, message: string, suggestions: string[]) => {
        setErrorDetails({ title, message, suggestions });
        if (transferState !== 'done') {
            setTransferState('error');
        }
    };
    
    const setStatus = (newStatus: TransferStatus) => {
        setStatusInternal(newStatus);
    
        if (newStatus.type !== 'error') {
            setErrorDetails(null);
            return;
        }
    
        const { code, context, message } = newStatus;
        
        const getFileDisplayNameForError = (ctx: typeof context): string => {
            if (ctx?.fileName) return `"${ctx.fileName}"`;
            if (ctx?.fileId) {
                const progressEntry = progress[ctx.fileId];
                if (progressEntry?.fileName) {
                    return `"${progressEntry.fileName}"`;
                }
                return `an unknown file (ID: ${ctx.fileId.substring(0, 8)}...)`;
            }
            return 'a file';
        };
        
        const fileDisplayName = getFileDisplayNameForError(context);
        
        let title = 'Transfer Error';
        let detailedMessage = message;
        let suggestions = [
            'An unexpected problem occurred during the transfer.',
            'Try canceling and starting a new transfer session.',
            'Check your internet connection and ask your peer to do the same.'
        ];
    
        switch (code) {
            case 'ENCRYPTION_FAILED':
                title = 'Encryption Failure';
                detailedMessage = `A security error occurred while trying to encrypt ${fileDisplayName} before sending. The transfer has been stopped to protect your data.`;
                suggestions = [
                    'This is an unexpected security issue. Please cancel this transfer and start a new one.',
                    'Ensure your browser is up-to-date.',
                    'If the problem persists, ask the AI Chat Agent for assistance.'
                ];
                break;
    
            case 'DECRYPTION_FAILED':
                title = 'Decryption Failure';
                detailedMessage = `A security error occurred while trying to decrypt incoming data for ${fileDisplayName}. This could indicate a connection problem or data tampering. The transfer has been stopped.`;
                suggestions = [
                    'This is a critical security warning. Please cancel the transfer immediately.',
                    'Try establishing a new connection with your peer.',
                    'Do not trust the received file if any part of it was saved.'
                ];
                break;
    
            case 'CHECKSUM_MISMATCH':
                title = 'File Integrity Check Failed';
                detailedMessage = `The transfer of ${fileDisplayName} completed, but the final file is corrupted because its integrity check failed.`;
                suggestions = [
                    'This can happen due to temporary network issues during the transfer.',
                    'Please ask the sender to re-transmit the file.',
                    'The corrupted file will not be available for download.'
                ];
                break;
        }

        handleError(title, detailedMessage, suggestions);
    };

    const connectWebSocket = (onOpenCallback: () => void) => {
        if (ws.current && ws.current.readyState < 2) {
             if (ws.current.readyState === 1) onOpenCallback();
             return;
        }
        ws.current = new WebSocket(SIGNALING_SERVER_URL);
        ws.current.onopen = onOpenCallback;
        ws.current.onmessage = handleSignalingMessage;
        ws.current.onerror = () => {
            setStatusInternal({ type: 'error', message: 'Signaling server connection error.' });
            handleError('Signaling Server Unreachable', 'Could not connect to the service required to initiate a transfer.', [
                'Please check your internet connection.',
                'If you are on a restrictive network (e.g., corporate, school), a firewall may be blocking the connection.',
                'For developers: Ensure the local signaling server is running on port 8080.'
            ]);
        };
        ws.current.onclose = () => { if (peerConnectedRef.current) setStatusInternal({ type: 'error', message: 'Signaling server disconnected.' }); };
    };

    const initializeModules = () => {
        if (webRTCManager.current) return;
        
        const onFileSentOrReceived = (file: {name: string; size: number; type: string;}, status: 'Sent' | 'Received') => {
            const duration = transferStartTime ? (Date.now() - transferStartTime) / 1000 : 0;
            const finalAverageSpeed = averageSpeed; 
            const newHistory = addHistoryEntry({
                fileName: file.name, fileSize: file.size, status, fileType: file.type,
                duration: Math.round(duration), averageSpeed: finalAverageSpeed
            });
            setHistory(newHistory);
        };
        
        webRTCManager.current = new WebRTCConnectionManager(ICE_SERVERS, {
            onConnectionStateChange: (state: ConnectionState) => {
                const connected = state === 'connected';
                setPeerConnected(connected);
                if (connected) {
                     setStatusInternal({ type: 'success', message: 'Peer connection established!' });
                     // If a schedule was set and the time has passed, start the transfer now that peer is connected.
                     if (isSender.current && scheduledTime && Date.now() >= scheduledTime) {
                         startScheduledTransfer();
                     } else if (isSender.current && filesToSend.length > 0 && !scheduledTime) {
                        setTransferState('transferring');
                        fileManager.current?.sendFiles(filesToSend);
                     }
                }
                if (['disconnected', 'failed', 'closed'].includes(state)) {
                    setPeerConnected(false);
                    setStatusInternal({ type: 'error', message: 'Peer has disconnected.' });
                     handleError('Peer Disconnected', 'The other user has disconnected, and the transfer has been canceled.', [
                        'You may need to start a new transfer session.',
                        'Contact the other user to ensure they are still available.'
                    ]);
                }
            },
            onIceCandidate: (candidate) => sendMessage('ice-candidate', { candidate }),
            onDataChannel: (dataChannel) => fileManager.current?.setDataChannel(dataChannel),
            onError: (error) => {
                setStatusInternal({ type: 'error', message: `WebRTC Error: ${error.message}` });
                handleError('Peer Connection Failed', 'A direct, secure connection to the other user could not be established.', [
                    'Ensure both you and your peer have a stable internet connection.',
                    'Try having the other user create the room and send you the ID instead.',
                    'Strict firewalls can sometimes block direct connections. Try using a different network if possible.'
                ]);
            }
        });
        fileManager.current = new FileTransferManager(webRTCManager.current, {
            onStatusUpdate: setStatus,
            onFileProgress: (p) => setProgress(prev => ({ ...prev, [p.fileId]: p })),
            onFileReceived: (file) => {
                setReceivedFiles(prev => [...prev, file]);
                onFileSentOrReceived(file, 'Received');
            },
            onFileSent: (file) => {
                onFileSentOrReceived(file, 'Sent');
            }
        });
        encryptionPipeline.current = new EncryptionPipeline();
    };

    const handleSignalingMessage = async (message: MessageEvent) => {
        const data = JSON.parse(message.data);
        if (!webRTCManager.current || !encryptionPipeline.current || !fileManager.current) {
            console.error("Modules not initialized!");
            return;
        }

        switch (data.type) {
            case 'room-joined':
                const newRoomId = data.payload.roomId;
                setRoomId(newRoomId);
                // If this room creation was for a scheduled transfer, save job to DB.
                if (scheduledTime && isSender.current) {
                    await saveScheduledJob({ files: filesToSend, scheduledTime, roomId: newRoomId });
                    setTransferState('scheduled');
                }
                break;
            case 'peer-joined':
                setStatusInternal({ type: 'info', message: 'Peer has joined. Negotiating secure channel...' });
                isSender.current = data.payload.initiator;
                const localPublicKey = await encryptionPipeline.current.initialize();
                sendMessage('public-key', { publicKey: localPublicKey });
                break;
            case 'public-key':
                await encryptionPipeline.current.deriveSharedSecret(data.payload.publicKey);
                fileManager.current.setEncryptionPipeline(encryptionPipeline.current);
                setStatusInternal({ type: 'success', message: 'Secure channel established. Starting WebRTC handshake...' });
                if (isSender.current) {
                    const dataChannel = webRTCManager.current.createDataChannel('fileTransfer');
                    fileManager.current.setDataChannel(dataChannel);
                    const offer = await webRTCManager.current.createOffer();
                    sendMessage('offer', { sdp: offer });
                }
                break;
            case 'offer':
                const answer = await webRTCManager.current.handleOffer(data.payload.sdp);
                sendMessage('answer', { sdp: answer });
                break;
            case 'answer': await webRTCManager.current.handleAnswer(data.payload.sdp); break;
            case 'ice-candidate': await webRTCManager.current.addIceCandidate(data.payload.candidate); break;
            case 'peer-left':
                setStatusInternal({ type: 'error', message: 'Peer has left the room.' });
                handleCancelTransfer();
                break;
            case 'error': 
                 setStatusInternal({ type: 'error', message: `Signaling Error: ${data.payload.message}` });
                 handleError('Room Error', `The server reported an error: ${data.payload.message}.`, [
                     'This may happen if the Room ID is incorrect or the room is already full.',
                     'Please verify the Room ID and try again.'
                 ]);
                 break;
        }
    };

    const sendMessage = (type: string, payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload: { ...payload, roomId: roomId || joinRoomId } }));
        }
    };
    
    const startScheduledTransfer = () => {
        if (peerConnectedRef.current) {
            setStatusInternal({ type: 'info', message: 'Starting scheduled transfer...' });
            setTransferState('transferring');
            fileManager.current?.sendFiles(filesToSend);
        } else {
             setStatusInternal({ type: 'error', message: 'Peer not connected at scheduled time.' });
             handleError('Scheduled Transfer Failed', 'Your peer was not connected at the scheduled start time.', [
                 'Please coordinate with your peer and start a new transfer manually.',
                 'Ensure both devices are online and on the app page before the scheduled time.'
             ]);
        }
        setScheduledTime(null);
        clearScheduledJob();
    };

    const handleStartSending = (selectedFiles: File[]) => {
        setFilesToSend(selectedFiles);
        setTransferStartTime(null);
        setAverageSpeed(0);
        setSpeedDataPoints([]);
        setProgress({});
        initializeModules();
        setTransferState('connecting');
        setStatusInternal({ type: 'info', message: 'Creating secure room...' });
        connectWebSocket(() => sendMessage('join-room', {}));
    };
    
    const handleScheduleTransfer = (time: number, selectedFiles: File[]) => {
        setScheduledTime(time);
        setFilesToSend(selectedFiles);
        setTransferStartTime(null);
        setAverageSpeed(0);
        setSpeedDataPoints([]);
        setProgress({});
        isSender.current = true;

        initializeModules();
        setTransferState('connecting'); // We are 'connecting' to the signaling server to get a room ID
        setStatusInternal({ type: 'info', message: `Scheduling transfer for ${new Date(time).toLocaleString()}` });
        
        // This will request a room, the 'room-joined' handler will then save the job to DB.
        connectWebSocket(() => sendMessage('join-room', {}));

        const delay = time - Date.now();
        if (delay > 0) {
            scheduleTimerId.current = window.setTimeout(startScheduledTransfer, delay);
        } else {
            // If time is in the past, it will start when the peer connects.
        }
    };
    
    const handleCancelSchedule = () => {
        if(scheduleTimerId.current) clearTimeout(scheduleTimerId.current);
        setScheduledTime(null);
        clearScheduledJob();
        handleCancelTransfer();
    };

    const handleStartReceiving = (id: string = joinRoomId) => {
        if (id.trim()) {
            initializeModules();
            connectWebSocket(() => sendMessage('join-room', { roomId: id.trim() }));
            setView('receiver');
            setStatusInternal({ type: 'info', message: `Attempting to join room ${id.trim()}...` });
        }
    };
    
    const handlePauseTransfer = () => {
        fileManager.current?.pause();
        setTransferState('paused');
    };

    const handleResumeTransfer = () => {
        fileManager.current?.resume();
        setTransferState('transferring');
    };

    const handleCancelTransfer = async () => {
        if (isSender.current && ['connecting', 'transferring', 'paused', 'scheduled'].includes(transferState) && filesToSend.length > 0) {
            const duration = transferStartTime ? (Date.now() - transferStartTime) / 1000 : 0;
            const completedFiles = new Set(Object.values(progress).filter(p => p.progress === 100).map(p => p.fileName));
            filesToSend.forEach(file => {
                 if (!completedFiles.has(file.name)) {
                     addHistoryEntry({
                        fileName: file.name, fileSize: file.size, status: 'Canceled', fileType: file.type,
                        duration: Math.round(duration), averageSpeed: 0
                    });
                 }
            });
            setHistory(getHistory());
        }

        // Full reset
        if(scheduleTimerId.current) clearTimeout(scheduleTimerId.current);
        await clearScheduledJob();
        webRTCManager.current?.disconnect();
        ws.current?.close();
        ws.current = null; webRTCManager.current = null; fileManager.current = null; encryptionPipeline.current = null;
        setView('initial'); isSender.current = false;
        setFilesToSend([]); setRoomId(''); setJoinRoomId(''); setPeerConnected(false);
        setTransferState('idle'); setProgress({}); setReceivedFiles([]);
        setTransferStartTime(null); setAverageSpeed(0); setSpeedDataPoints([]); setScheduledTime(null);
        setErrorDetails(null);
        setStatusInternal({ type: 'info', message: 'Ready to connect.' });
    };

    const handleClearHistory = () => setHistory(clearHistory());

    const getStatusColor = () => status.type === 'success' ? 'text-green-500' : status.type === 'error' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400';

    const renderInitialView = () => (
         <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-full">
                <ShareIcon className="w-12 h-12 text-primary-light mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Send Files</h2>
                <p className="text-gray-500 dark:text-gray-400 flex-grow mb-4">Select files and create a secure room to share them.</p>
                <button onClick={() => { setView('host'); }} className="w-full px-6 py-3 bg-primary-light text-white font-bold rounded-lg shadow-md hover:bg-secondary-light transition-colors">
                    Start Sending
                </button>
            </div>
            <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-full">
                <LinkIcon className="w-12 h-12 text-accent mb-4"/>
                <h2 className="text-2xl font-bold mb-2">Receive Files</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Enter a Room ID from a sender to start receiving files securely.</p>
                <input 
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Enter Room ID"
                    aria-label="Enter Room ID to receive files"
                    className="w-full text-center font-mono text-lg px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button onClick={() => handleStartReceiving()} disabled={!joinRoomId.trim()} className="mt-4 w-full px-6 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Join & Receive
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (view === 'host') {
            return <SenderView
                roomId={roomId}
                peerConnected={peerConnected}
                onStartTransfer={handleStartSending}
                onScheduleTransfer={handleScheduleTransfer}
                onPauseTransfer={handlePauseTransfer}
                onResumeTransfer={handleResumeTransfer}
                onCancelTransfer={handleCancelTransfer}
                onCancelSchedule={handleCancelSchedule}
                files={filesToSend}
                progress={progress}
                transferState={transferState}
                transferSpeed={transferSpeed}
                averageSpeed={averageSpeed}
                eta={eta}
                status={status}
                scheduledTime={scheduledTime}
                speedData={speedDataPoints}
            />;
        }
        if (view === 'receiver') {
            return <ReceiverView 
                peerConnected={peerConnected}
                progress={progress}
                receivedFiles={receivedFiles}
                status={status}
                onCancelTransfer={handleCancelTransfer}
                scheduledTime={scheduledTime}
            />;
        }
        return renderInitialView();
    };

    return (
        <div className="animate-slide-in space-y-8">
             {errorDetails && <ErrorNotificationModal {...errorDetails} onClose={() => setErrorDetails(null)} />}
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Peer-to-Peer File Transfer</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Share files directly with another device using a secure, end-to-end encrypted connection. No data is ever uploaded to a server.
                </p>
            </div>
            
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg min-h-[400px] flex flex-col justify-center items-center">
                {renderContent()}
            </div>
             <footer className="text-center" aria-live="polite" aria-atomic="true">
                <p className={`text-sm font-semibold transition-colors ${getStatusColor()}`}>{status.message}</p>
            </footer>
             <TransferHistory history={history} onClear={handleClearHistory} />
        </div>
    );
};

export default FileTransferPage;