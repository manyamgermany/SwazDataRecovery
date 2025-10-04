import { WebRTCConnectionManager } from './WebRTCConnectionManager';
import { calculateSHA256 } from './cryptoService';
import { EncryptionPipeline } from './EncryptionPipeline';

const CHUNK_SIZE = 64 * 1024; // 64 KB
const RETRANSMISSION_TIMEOUT = 5000; // 5 seconds

// Type definitions for the file transfer protocol
type FileMetadata = {
    fileId: string;
    name: string;
    type: string;
    size: number;
    totalChunks: number;
    fullFileChecksum: string;
};
type ChunkMetadata = {
    fileId: string;
    chunkIndex: number;
    size: number;
    checksum: string;
};
type ProtocolMessage = 
    | { type: 'file-metadata', payload: FileMetadata }
    | { type: 'chunk-metadata', payload: ChunkMetadata } // Explicitly for receiver side type guarding
    | { type: 'chunk-ack', payload: { fileId: string, chunkIndex: number } }
    | { type: 'file-received-ack', payload: { fileId: string } };

// Callbacks for the UI to subscribe to
export type FileProgress = { fileId: string; fileName: string; progress: number; };
export type ReceivedFile = { name: string; type: string; size: number; url: string; };
export type TransferStatus = { type: 'info' | 'error' | 'success'; message: string; };

type FileTransferManagerCallbacks = {
    onStatusUpdate: (status: TransferStatus) => void;
    onFileProgress: (progress: FileProgress) => void;
    onFileReceived: (file: ReceivedFile) => void;
    onFileSent: (file: File) => void;
};

// State for sending a file
type SendingFileState = {
    file: File;
    metadata: FileMetadata;
    chunks: ArrayBuffer[];
    acknowledgedChunks: boolean[];
    retransmissionTimers: (number | null)[];
};

// State for receiving a file
type ReceivingFileState = {
    metadata: FileMetadata;
    chunks: (ArrayBuffer | null)[];
    receivedChunksCount: number;
};

export class FileTransferManager {
    private webRTCManager: WebRTCConnectionManager;
    private dataChannel: RTCDataChannel | null = null;
    private callbacks: FileTransferManagerCallbacks;
    private encryptionPipeline: EncryptionPipeline | null = null;

    private filesToSend: File[] = [];
    private sendingFileState: SendingFileState | null = null;
    private receivingFiles: Map<string, ReceivingFileState> = new Map();
    private awaitingChunkDataFor: ChunkMetadata | null = null;

    private isPaused = false;

    constructor(webRTCManager: WebRTCConnectionManager, callbacks: FileTransferManagerCallbacks) {
        this.webRTCManager = webRTCManager;
        this.callbacks = callbacks;
    }

    public setEncryptionPipeline(pipeline: EncryptionPipeline) {
        this.encryptionPipeline = pipeline;
    }

    public setDataChannel(dataChannel: RTCDataChannel) {
        this.dataChannel = dataChannel;
        this.dataChannel.binaryType = 'arraybuffer';
        this.dataChannel.onmessage = this.handleDataChannelMessage.bind(this);
        this.dataChannel.onopen = () => this.callbacks.onStatusUpdate({ type: 'info', message: 'Data channel is open.' });
        this.dataChannel.onclose = () => this.callbacks.onStatusUpdate({ type: 'info', message: 'Data channel has closed.' });
    }

    public pause() {
        this.isPaused = true;
        this.callbacks.onStatusUpdate({ type: 'info', message: 'Transfer paused.' });
        // Clear any active retransmission timers
        if (this.sendingFileState) {
            this.sendingFileState.retransmissionTimers.forEach(timerId => {
                if (timerId) clearTimeout(timerId);
            });
            this.sendingFileState.retransmissionTimers.fill(null);
        }
    }

    public resume() {
        if (!this.sendingFileState || !this.isPaused) return;
        this.isPaused = false;
        this.callbacks.onStatusUpdate({ type: 'info', message: 'Transfer resumed.' });

        // Find the next unacknowledged chunk and start sending from there
        const nextChunkIndex = this.sendingFileState.acknowledgedChunks.indexOf(false);
        if (nextChunkIndex !== -1) {
            this.sendChunk(nextChunkIndex);
        }
    }


    public async sendFiles(files: File[]) {
        if (!this.encryptionPipeline) {
            this.callbacks.onStatusUpdate({ type: 'error', message: 'Encryption is not set up. Cannot send files.' });
            return;
        }
        if (!files.length) return;
        this.filesToSend = [...files];
        if (!this.sendingFileState) {
            await this.startNextFileTransfer();
        }
    }

    private async startNextFileTransfer() {
        if (this.filesToSend.length === 0) {
            this.sendingFileState = null;
            this.callbacks.onStatusUpdate({ type: 'success', message: 'All files have been sent successfully!' });
            return;
        }

        const file = this.filesToSend.shift()!;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileId = `${file.name}-${file.size}-${Date.now()}`;

        const chunks = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = start + CHUNK_SIZE;
            chunks.push(file.slice(start, end).arrayBuffer());
        }

        this.sendingFileState = {
            file,
            chunks: await Promise.all(chunks),
            metadata: {
                fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                totalChunks,
                fullFileChecksum: await calculateSHA256(file),
            },
            acknowledgedChunks: new Array(totalChunks).fill(false),
            retransmissionTimers: new Array(totalChunks).fill(null),
        };

        this.sendMessage({ type: 'file-metadata', payload: this.sendingFileState.metadata });
        this.callbacks.onStatusUpdate({ type: 'info', message: `Sending metadata for ${file.name}...` });
        this.sendChunk(0); // Start sending the first chunk
    }

    private async sendChunk(chunkIndex: number) {
        if (!this.sendingFileState || chunkIndex >= this.sendingFileState.metadata.totalChunks || !this.encryptionPipeline || this.isPaused) return;
        
        const { fileId, name } = this.sendingFileState.metadata;
        const chunkData = this.sendingFileState.chunks[chunkIndex];
        const checksum = await calculateSHA256(chunkData);

        const chunkMetadata: ChunkMetadata = { fileId, chunkIndex, size: chunkData.byteLength, checksum };

        const encryptedChunk = await this.encryptionPipeline.encrypt(chunkData);
        if (!encryptedChunk) {
            this.callbacks.onStatusUpdate({ type: 'error', message: `Encryption failed for chunk ${chunkIndex+1} of ${name}.` });
            return;
        }

        // Send metadata first, then the encrypted binary data
        this.sendMessage({ type: 'chunk-metadata', payload: chunkMetadata });
        this.dataChannel?.send(encryptedChunk);

        // Set a timer to retransmit if not acknowledged
        const timerId = window.setTimeout(() => {
            if (this.sendingFileState?.metadata.fileId === fileId && !this.sendingFileState.acknowledgedChunks[chunkIndex]) {
                this.callbacks.onStatusUpdate({ type: 'info', message: `Chunk ${chunkIndex + 1} of ${name} lost, retransmitting...` });
                this.sendChunk(chunkIndex);
            }
        }, RETRANSMISSION_TIMEOUT);
        this.sendingFileState.retransmissionTimers[chunkIndex] = timerId;
    }

    private async handleDataChannelMessage(event: MessageEvent) {
        // Handle binary data (encrypted chunks)
        if (event.data instanceof ArrayBuffer) {
            if (this.awaitingChunkDataFor && this.encryptionPipeline) {
                const chunkMetadataContext = this.awaitingChunkDataFor;
                this.awaitingChunkDataFor = null; // Consume the context

                const decryptedData = await this.encryptionPipeline.decrypt(event.data);
                if (decryptedData) {
                    this.handleChunkData(decryptedData, chunkMetadataContext);
                } else {
                    this.callbacks.onStatusUpdate({ type: 'error', message: `Decryption failed for chunk ${chunkMetadataContext.chunkIndex}.` });
                }
            } else {
                 console.warn('Received unexpected binary data without preceding metadata.');
            }
            return;
        }

        // Handle string data (JSON protocol messages)
        try {
            const message = JSON.parse(event.data) as ProtocolMessage;
            switch (message.type) {
                case 'file-metadata': this.handleFileMetadata(message.payload); break;
                case 'chunk-metadata': this.awaitingChunkDataFor = message.payload; break;
                case 'chunk-ack': this.handleChunkAck(message.payload.fileId, message.payload.chunkIndex); break;
                case 'file-received-ack': this.handleFileReceivedAck(message.payload.fileId); break;
                default: console.warn('Unknown message type received in data channel:', (message as any).type);
            }
        } catch (error) {
            console.error('Failed to parse incoming data channel message:', event.data, error);
        }
    }

    private handleFileMetadata(metadata: FileMetadata) {
        this.receivingFiles.set(metadata.fileId, {
            metadata,
            chunks: new Array(metadata.totalChunks).fill(null),
            receivedChunksCount: 0
        });
        this.callbacks.onStatusUpdate({ type: 'info', message: `Receiving metadata for ${metadata.name}` });
        this.callbacks.onFileProgress({ fileId: metadata.fileId, fileName: metadata.name, progress: 0 });
    }

    private async handleChunkData(decryptedChunkData: ArrayBuffer, metadata: ChunkMetadata) {
        const { fileId, chunkIndex, checksum } = metadata;
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState) return;

        const receivedChecksum = await calculateSHA256(decryptedChunkData);
        if (receivedChecksum === checksum) {
            if (!fileState.chunks[chunkIndex]) {
                fileState.chunks[chunkIndex] = decryptedChunkData;
                fileState.receivedChunksCount++;
            }
            this.sendMessage({ type: 'chunk-ack', payload: { fileId, chunkIndex } });

            const progress = Math.round((fileState.receivedChunksCount / fileState.metadata.totalChunks) * 100);
            this.callbacks.onFileProgress({ fileId, fileName: fileState.metadata.name, progress });

            if (fileState.receivedChunksCount === fileState.metadata.totalChunks) {
                this.reconstructFile(fileId);
            }
        } else {
            this.callbacks.onStatusUpdate({ type: 'error', message: `Checksum mismatch for chunk ${chunkIndex} of ${fileState.metadata.name}. Awaiting retransmission.` });
        }
    }

    private async reconstructFile(fileId: string) {
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState || fileState.chunks.includes(null)) {
            this.callbacks.onStatusUpdate({ type: 'error', message: `File reconstruction for ${fileState?.metadata.name} failed: missing chunks.` });
            return;
        };

        const fileBlob = new Blob(fileState.chunks as BlobPart[]);
        const fileBuffer = await fileBlob.arrayBuffer();
        const fullFileChecksum = await calculateSHA256(fileBuffer);

        if (fullFileChecksum === fileState.metadata.fullFileChecksum) {
            const url = URL.createObjectURL(fileBlob);
            this.callbacks.onFileReceived({
                name: fileState.metadata.name,
                type: fileState.metadata.type,
                size: fileState.metadata.size,
                url,
            });
            this.sendMessage({ type: 'file-received-ack', payload: { fileId } });
            this.receivingFiles.delete(fileId);
        } else {
            this.callbacks.onStatusUpdate({ type: 'error', message: `Final file checksum mismatch for ${fileState.metadata.name}. Transfer failed.` });
        }
    }
    
    private handleChunkAck(fileId: string, chunkIndex: number) {
        if (!this.sendingFileState || this.sendingFileState.metadata.fileId !== fileId) return;
        
        const { acknowledgedChunks, retransmissionTimers, metadata } = this.sendingFileState;
        
        const timer = retransmissionTimers[chunkIndex];
        if (timer) clearTimeout(timer);
        retransmissionTimers[chunkIndex] = null;
        
        if (!acknowledgedChunks[chunkIndex]) {
            acknowledgedChunks[chunkIndex] = true;
            const ackedCount = acknowledgedChunks.filter(Boolean).length;
            const progress = Math.round((ackedCount / metadata.totalChunks) * 100);
            this.callbacks.onFileProgress({ fileId, fileName: metadata.name, progress });
        }
        
        const nextChunkIndex = acknowledgedChunks.indexOf(false);
        if (nextChunkIndex !== -1) {
            // Only send the next chunk if we're not paused
            if (!this.isPaused) {
                this.sendChunk(nextChunkIndex);
            }
        }
    }

    private handleFileReceivedAck(fileId: string) {
        if (this.sendingFileState?.metadata.fileId === fileId) {
            this.callbacks.onStatusUpdate({ type: 'success', message: `Peer confirmed receipt of ${this.sendingFileState.file.name}.` });
            this.callbacks.onFileSent(this.sendingFileState.file);
            this.startNextFileTransfer();
        }
    }

    private sendMessage(message: Omit<ProtocolMessage, 'type'> & { type: string }) {
        if (this.dataChannel?.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
        }
    }
}