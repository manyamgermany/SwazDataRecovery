import React, { useState, useEffect, useRef } from 'react';
import { WebRTCConnectionManager, ConnectionState } from '../services/WebRTCConnectionManager';
import { FileTransferManager, TransferStatus, FileProgress, ReceivedFile } from '../services/webrtcService';
import { EncryptionPipeline } from '../services/EncryptionPipeline';
import SenderView from './SenderView';
import ReceiverView from './ReceiverView';
import { LinkIcon, ShareIcon } from './icons/Icons';
import { TransferHistoryEntry } from '../types';
import { getHistory, addHistoryEntry, clearHistory } from '../utils/history';
import TransferHistory from './TransferHistory';

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

export type TransferState = 'idle' | 'connecting' | 'transferring' | 'paused' | 'done' | 'error';
type View = 'initial' | 'host' | 'receiver';

const FileTransferPage: React.FC = () => {
    const [view, setView] = useState<View>('initial');
    const [roomId, setRoomId] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [status, setStatus] = useState<TransferStatus>({ type: 'info', message: 'Ready to connect.' });
    const [peerConnected, setPeerConnected] = useState(false);
    const [progress, setProgress] = useState<Record<string, FileProgress>>({});
    const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
    const [filesToSend, setFilesToSend] = useState<File[]>([]);
    
    const [transferState, setTransferState] = useState<TransferState>('idle');
    const [transferSpeed, setTransferSpeed] = useState(0); // B/s
    const [averageSpeed, setAverageSpeed] = useState(0); // B/s
    const [eta, setEta] = useState(0); // seconds
    const [transferStartTime, setTransferStartTime] = useState<number | null>(null);

    const [history, setHistory] = useState<TransferHistoryEntry[]>([]);
    
    const ws = useRef<WebSocket | null>(null);
    const webRTCManager = useRef<WebRTCConnectionManager | null>(null);
    const fileManager = useRef<FileTransferManager | null>(null);
    const encryptionPipeline = useRef<EncryptionPipeline | null>(null);
    const isSender = useRef(false);
    
    const progressHistory = useRef<{ time: number, bytes: number }[]>([]);

    useEffect(() => {
        setHistory(getHistory());
        return () => {
            webRTCManager.current?.disconnect();
            ws.current?.close();
        };
    }, []);

    useEffect(() => {
        if (transferState !== 'transferring') {
            setTransferSpeed(0);
            if (transferState !== 'paused') {
                setAverageSpeed(0);
            }
            setEta(0);
            progressHistory.current = [];
            return;
        }

        if (!transferStartTime) {
            setTransferStartTime(Date.now());
        }

        const totalBytes = filesToSend.reduce((sum, f) => sum + f.size, 0);
        const transferredBytes = Object.values(progress).reduce((sum, p) => {
            const file = filesToSend.find(f => f.name === p.fileName);
            return sum + ((file?.size || 0) * p.progress) / 100;
        }, 0);

        const now = Date.now();
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
                const remainingBytes = totalBytes - transferredBytes;
                setEta(speed > 0 ? remainingBytes / speed : 0);
            }
        }
        
        if (transferStartTime) {
            const totalTimeElapsed = (Date.now() - transferStartTime) / 1000;
            if (totalTimeElapsed > 0) {
                const avgSpeed = transferredBytes / totalTimeElapsed;
                setAverageSpeed(avgSpeed > 0 ? avgSpeed : 0);
            }
        }
        
        const allDone = Object.values(progress).every(p => p.progress === 100) && filesToSend.length > 0 && Object.keys(progress).length === filesToSend.length;
        if (allDone) {
            setTransferState('done');
        }

    }, [progress, filesToSend, transferState, transferStartTime]);

    const connectWebSocket = (onOpenCallback: () => void) => {
        if (ws.current && ws.current.readyState < 2) {
             if (ws.current.readyState === 1) onOpenCallback();
             return;
        }
        ws.current = new WebSocket(SIGNALING_SERVER_URL);
        ws.current.onopen = onOpenCallback;
        ws.current.onmessage = handleSignalingMessage;
        ws.current.onerror = () => setStatus({ type: 'error', message: 'Signaling server connection error. Please ensure it is running and accessible.' });
        ws.current.onclose = () => { if (peerConnected) setStatus({ type: 'error', message: 'Signaling server disconnected.' }); };
    };

    const initializeModules = () => {
        if (webRTCManager.current) return;
        
        webRTCManager.current = new WebRTCConnectionManager(ICE_SERVERS, {
            onConnectionStateChange: (state: ConnectionState) => {
                const connected = state === 'connected';
                setPeerConnected(connected);
                if (connected) {
                     setStatus({ type: 'success', message: 'Peer connection established!' });
                     if (isSender.current && filesToSend.length > 0) {
                        setTransferState('transferring');
                        fileManager.current?.sendFiles(filesToSend);
                     }
                }
                if (['disconnected', 'failed', 'closed'].includes(state)) {
                    setPeerConnected(false);
                    setStatus({ type: 'error', message: 'Peer has disconnected.' });
                    if (transferState !== 'done') {
                        setTransferState('error');
                    }
                }
            },
            onIceCandidate: (candidate) => sendMessage('ice-candidate', { candidate }),
            onDataChannel: (dataChannel) => fileManager.current?.setDataChannel(dataChannel),
            onError: (error) => setStatus({ type: 'error', message: `WebRTC Error: ${error.message}` })
        });
        fileManager.current = new FileTransferManager(webRTCManager.current, {
            onStatusUpdate: setStatus,
            onFileProgress: (p) => setProgress(prev => ({ ...prev, [p.fileId]: p })),
            onFileReceived: (file) => {
                setReceivedFiles(prev => [...prev, file]);
                const newHistory = addHistoryEntry({
                    fileName: file.name,
                    fileSize: file.size,
                    status: 'Received',
                    fileType: file.type,
                });
                setHistory(newHistory);
            },
            onFileSent: (file) => {
                const newHistory = addHistoryEntry({
                    fileName: file.name,
                    fileSize: file.size,
                    status: 'Sent',
                    fileType: file.type,
                });
                setHistory(newHistory);
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
                setRoomId(data.payload.roomId); 
                break;
            case 'peer-joined':
                setStatus({ type: 'info', message: 'Peer has joined. Negotiating secure channel...' });
                isSender.current = data.payload.initiator;
                const localPublicKey = await encryptionPipeline.current.initialize();
                sendMessage('public-key', { publicKey: localPublicKey });
                break;
            case 'public-key':
                await encryptionPipeline.current.deriveSharedSecret(data.payload.publicKey);
                fileManager.current.setEncryptionPipeline(encryptionPipeline.current);
                setStatus({ type: 'success', message: 'Secure channel established. Starting WebRTC handshake...' });
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
            case 'answer': 
                await webRTCManager.current.handleAnswer(data.payload.sdp); 
                break;
            case 'ice-candidate': 
                await webRTCManager.current.addIceCandidate(data.payload.candidate); 
                break;
            case 'peer-left':
                setStatus({ type: 'error', message: 'Peer has left the room.' });
                handleCancelTransfer();
                break;
            case 'error': 
                setStatus({ type: 'error', message: `Signaling Error: ${data.payload.message}` }); 
                break;
        }
    };

    const sendMessage = (type: string, payload: any) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type, payload: { ...payload, roomId: roomId || joinRoomId } }));
        }
    };

    const handleStartSending = (selectedFiles: File[]) => {
        setFilesToSend(selectedFiles);
        setTransferStartTime(null);
        setAverageSpeed(0);
        
        initializeModules();
        
        setTransferState('connecting');
        setStatus({ type: 'info', message: 'Creating secure room...' });
        connectWebSocket(() => sendMessage('join-room', {}));
    };

    const handleStartReceiving = () => {
        if (joinRoomId.trim()) {
            initializeModules();
            connectWebSocket(() => sendMessage('join-room', { roomId: joinRoomId.trim() }));
            setView('receiver');
            setStatus({ type: 'info', message: `Attempting to join room ${joinRoomId.trim()}...` });
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

    const handleCancelTransfer = () => {
        if (isSender.current && ['connecting', 'transferring', 'paused'].includes(transferState) && filesToSend.length > 0) {
            let updatedHistory: TransferHistoryEntry[] | undefined;
            const completedFiles = new Set(Object.values(progress).filter(p => p.progress === 100).map(p => p.fileName));
            filesToSend.forEach(file => {
                 if (!completedFiles.has(file.name)) {
                     updatedHistory = addHistoryEntry({
                        fileName: file.name,
                        fileSize: file.size,
                        status: 'Canceled',
                        fileType: file.type,
                    });
                 }
            });
            if (updatedHistory) {
                setHistory(updatedHistory);
            }
        }

        // Full reset
        webRTCManager.current?.disconnect();
        ws.current?.close();
        ws.current = null;
        webRTCManager.current = null;
        fileManager.current = null;
        encryptionPipeline.current = null;
        setView('initial');
        isSender.current = false;
        setFilesToSend([]);
        setRoomId('');
        setJoinRoomId('');
        setPeerConnected(false);
        setTransferState('idle');
        setProgress({});
        setReceivedFiles([]);
        setTransferStartTime(null);
        setAverageSpeed(0);
        setStatus({ type: 'info', message: 'Ready to connect.' });
    };

    const handleClearHistory = () => {
        const newHistory = clearHistory();
        setHistory(newHistory);
    };

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
                    className="w-full text-center font-mono text-lg px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button onClick={handleStartReceiving} disabled={!joinRoomId.trim()} className="mt-4 w-full px-6 py-3 bg-accent text-white font-bold rounded-lg shadow-md hover:bg-opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
                onPauseTransfer={handlePauseTransfer}
                onResumeTransfer={handleResumeTransfer}
                onCancelTransfer={handleCancelTransfer}
                files={filesToSend}
                progress={progress}
                transferState={transferState}
                transferSpeed={transferSpeed}
                averageSpeed={averageSpeed}
                eta={eta}
                status={status}
            />;
        }
        if (view === 'receiver') {
            return <ReceiverView 
                peerConnected={peerConnected}
                progress={progress}
                receivedFiles={receivedFiles}
                status={status}
                onCancelTransfer={handleCancelTransfer}
            />;
        }
        return renderInitialView();
    };

    return (
        <div className="animate-slide-in space-y-8">
            <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-text-light dark:text-text-dark">Peer-to-Peer File Transfer</h1>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    Share files directly with another device using a secure, end-to-end encrypted connection. No data is ever uploaded to a server.
                </p>
            </div>
            
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg min-h-[400px] flex flex-col justify-center items-center">
                {renderContent()}
            </div>
             <footer className="text-center">
                <p className={`text-sm font-semibold transition-colors ${getStatusColor()}`}>{status.message}</p>
            </footer>
             <TransferHistory history={history} onClear={handleClearHistory} />
        </div>
    );
};

export default FileTransferPage;