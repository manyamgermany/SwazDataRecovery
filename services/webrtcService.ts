import { WebRTCConnectionManager } from './WebRTCConnectionManager';
import { calculateSHA256 } from './cryptoService';
import { EncryptionPipeline } from './EncryptionPipeline';

// Constants for backpressure mechanism
const HIGH_WATER_MARK = 15 * 1024 * 1024; // 15 MB buffer
const LOW_WATER_MARK = 8 * 1024 * 1024; // 8 MB buffer

// Constants for adaptive chunk sizing
const MIN_CHUNK_SIZE = 16 * 1024;   // 16 KB
const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KB
const MAX_CHUNK_SIZE = 256 * 1024; // 256 KB

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
    | { type: 'chunk-metadata', payload: ChunkMetadata }
    | { type: 'transfer-complete', payload: { fileId: string } } // Sender -> Receiver
    | { type: 'request-chunks', payload: { fileId: string; indexes: number[] } } // Receiver -> Sender
    | { type: 'file-received-ack', payload: { fileId: string } };

// Callbacks for the UI to subscribe to
export type FileProgress = {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    progress: number;
    transferredChunks: number;
    totalChunks: number;
};
export type ReceivedFile = { name: string; type: string; size: number; url: string; };
export type TransferStatus = 
    | { type: 'info' | 'success'; message: string; }
    | { type: 'error'; message: string; code?: 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'CHECKSUM_MISMATCH'; context?: { fileName?: string; fileId?: string; chunkIndex?: number }};


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
    sentChunksCount: number;
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
    private chunkSize = DEFAULT_CHUNK_SIZE;
    private consecutiveBufferWaits = 0;

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
        this.dataChannel.bufferedAmountLowThreshold = LOW_WATER_MARK;
    }

    public pause() {
        this.isPaused = true;
        this.callbacks.onStatusUpdate({ type: 'info', message: 'Transfer paused.' });
    }

    public resume() {
        if (!this.sendingFileState || !this.isPaused) return;
        this.isPaused = false;
        this.callbacks.onStatusUpdate({ type: 'info', message: 'Transfer resumed.' });
    }

    public async sendFiles(files: File[]) {
        if (!this.encryptionPipeline) {
            this.callbacks.onStatusUpdate({ type: 'error', message: 'Encryption is not set up. Cannot send files.' });
            return;
        }
        if (!files.length) return;
        this.filesToSend = [...files];
        if (!this.sendingFileState) {
            this.startNextFileTransfer();
        }
    }

    private async startNextFileTransfer() {
        if (this.filesToSend.length === 0) {
            this.sendingFileState = null;
            this.callbacks.onStatusUpdate({ type: 'success', message: 'All files have been sent successfully!' });
            return;
        }

        const file = this.filesToSend.shift()!;
        // Reset chunk size for each new file
        this.chunkSize = DEFAULT_CHUNK_SIZE;
        const totalChunks = Math.ceil(file.size / this.chunkSize);
        const fileId = `${file.name}-${file.size}-${Date.now()}`;

        this.sendingFileState = {
            file,
            metadata: {
                fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                totalChunks,
                fullFileChecksum: await calculateSHA256(file),
            },
            sentChunksCount: 0,
        };

        this.sendMessage({ type: 'file-metadata', payload: this.sendingFileState.metadata });
        this.callbacks.onStatusUpdate({ type: 'info', message: `Sending metadata for ${file.name}...` });
        this.streamFile(); // Fire-and-forget async method
    }

    private async streamFile() {
        if (!this.sendingFileState || !this.dataChannel || !this.encryptionPipeline) return;

        const { file, metadata } = this.sendingFileState;
        const { fileId, name } = metadata;
        const totalChunks = Math.ceil(file.size / this.chunkSize);
        this.sendingFileState.metadata.totalChunks = totalChunks;

        for (let i = this.sendingFileState.sentChunksCount; i < totalChunks; i++) {
            while (this.isPaused) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (!this.sendingFileState || this.sendingFileState.metadata.fileId !== fileId) {
                this.callbacks.onStatusUpdate({ type: 'info', message: `Transfer of ${name} was cancelled.` });
                return;
            }

            if (this.dataChannel.bufferedAmount > HIGH_WATER_MARK) {
                await this.waitForBufferToClear();
                this.consecutiveBufferWaits++;
                if (this.consecutiveBufferWaits > 2) {
                    this.chunkSize = Math.max(MIN_CHUNK_SIZE, this.chunkSize / 2);
                    this.consecutiveBufferWaits = 0;
                }
            } else {
                this.consecutiveBufferWaits = 0;
                 if (this.dataChannel.bufferedAmount < LOW_WATER_MARK / 2) {
                    this.chunkSize = Math.min(MAX_CHUNK_SIZE, Math.floor(this.chunkSize * 1.1));
                }
            }
            
            await this.sendChunk(i, totalChunks);
        }
        
        // After sending all chunks, notify the receiver
        this.sendMessage({ type: 'transfer-complete', payload: { fileId } });
    }

    private async resendChunks(fileId: string, indexes: number[]) {
         if (!this.sendingFileState || this.sendingFileState.metadata.fileId !== fileId) return;
         this.callbacks.onStatusUpdate({ type: 'info', message: `Resending ${indexes.length} missing chunks for ${this.sendingFileState.file.name}...` });
         const totalChunks = this.sendingFileState.metadata.totalChunks;
         for (const index of indexes) {
              await this.sendChunk(index, totalChunks);
         }
         this.sendMessage({ type: 'transfer-complete', payload: { fileId } });
    }
    
    private async sendChunk(chunkIndex: number, totalChunks: number) {
        if (!this.sendingFileState || !this.dataChannel || !this.encryptionPipeline) return;
        
        const { file, metadata } = this.sendingFileState;
        const { fileId, name, type } = metadata;

        const start = chunkIndex * this.chunkSize;
        const end = start + this.chunkSize;
        const chunkBlob = file.slice(start, end);
        const chunkData = await chunkBlob.arrayBuffer();

        const chunkChecksum = await calculateSHA256(chunkData);

        const chunkMetadata: ChunkMetadata = {
            fileId,
            chunkIndex,
            size: chunkData.byteLength,
            checksum: chunkChecksum,
        };

        const encryptedChunk = await this.encryptionPipeline.encrypt(chunkData);
        if (!encryptedChunk) {
            this.callbacks.onStatusUpdate({ type: 'error', message: `Encryption failed for chunk ${chunkIndex + 1} of ${name}.`, code: 'ENCRYPTION_FAILED', context: { fileName: name, fileId, chunkIndex } });
            this.webRTCManager.disconnect();
            return;
        }

        this.sendMessage({ type: 'chunk-metadata', payload: chunkMetadata });
        this.dataChannel.send(encryptedChunk);

        if (chunkIndex >= this.sendingFileState.sentChunksCount) {
             this.sendingFileState.sentChunksCount++;
        }
       
        const progress = Math.round((this.sendingFileState.sentChunksCount / totalChunks) * 100);
        this.callbacks.onFileProgress({
            fileId,
            fileName: name,
            fileSize: file.size,
            fileType: type,
            progress,
            transferredChunks: this.sendingFileState.sentChunksCount,
            totalChunks,
        });
    }

    private waitForBufferToClear(): Promise<void> {
        return new Promise(resolve => {
            if (!this.dataChannel) {
                resolve();
                return;
            }
            const onBufferLow = () => {
                this.dataChannel?.removeEventListener('bufferedamountlow', onBufferLow);
                resolve();
            };
            this.dataChannel.addEventListener('bufferedamountlow', onBufferLow);
        });
    }

    private async handleDataChannelMessage(event: MessageEvent) {
        if (event.data instanceof ArrayBuffer) {
            if (this.awaitingChunkDataFor && this.encryptionPipeline) {
                const chunkMetadataContext = this.awaitingChunkDataFor;
                this.awaitingChunkDataFor = null;

                const decryptedData = await this.encryptionPipeline.decrypt(event.data);
                if (decryptedData) {
                    this.handleChunkData(decryptedData, chunkMetadataContext);
                } else {
                    const fileState = this.receivingFiles.get(chunkMetadataContext.fileId);
                    this.callbacks.onStatusUpdate({ 
                        type: 'error', 
                        message: `Decryption failed for a chunk of ${fileState?.metadata.name || 'a file'}.`, 
                        code: 'DECRYPTION_FAILED', 
                        context: { 
                            fileName: fileState?.metadata.name,
                            fileId: chunkMetadataContext.fileId,
                            chunkIndex: chunkMetadataContext.chunkIndex 
                        } 
                    });
                }
            } else {
                 console.warn('Received unexpected binary data without preceding metadata.');
            }
            return;
        }

        try {
            const message = JSON.parse(event.data) as ProtocolMessage;
            switch (message.type) {
                case 'file-metadata': this.handleFileMetadata(message.payload); break;
                case 'chunk-metadata': this.awaitingChunkDataFor = message.payload; break;
                case 'transfer-complete': this.handleTransferComplete(message.payload.fileId); break;
                case 'request-chunks': this.resendChunks(message.payload.fileId, message.payload.indexes); break;
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
        this.callbacks.onFileProgress({
            fileId: metadata.fileId,
            fileName: metadata.name,
            fileSize: metadata.size,
            fileType: metadata.type,
            progress: 0,
            transferredChunks: 0,
            totalChunks: metadata.totalChunks,
        });
    }

    private async handleChunkData(decryptedChunkData: ArrayBuffer, metadata: ChunkMetadata) {
        const { fileId, chunkIndex, checksum } = metadata;
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState) return;

        const receivedChecksum = await calculateSHA256(decryptedChunkData);
        if (receivedChecksum !== checksum) {
            this.callbacks.onStatusUpdate({
                type: 'info',
                message: `Data corruption detected in a chunk for ${fileState.metadata.name}. It will be re-requested automatically.`,
            });
            console.warn(`Chunk checksum mismatch for file ${fileId}, chunk ${chunkIndex}. Expected ${checksum}, got ${receivedChecksum}. Discarding chunk.`);
            return;
        }
        
        if (fileState.metadata.totalChunks <= chunkIndex) {
            // This can happen if chunk size was adapted mid-transfer
            const oldChunks = fileState.chunks;
            fileState.chunks = new Array(chunkIndex + 1).fill(null);
            fileState.chunks.splice(0, oldChunks.length, ...oldChunks);
            fileState.metadata.totalChunks = chunkIndex + 1;
        }

        if (!fileState.chunks[chunkIndex]) {
            fileState.chunks[chunkIndex] = decryptedChunkData;
            fileState.receivedChunksCount++;
        }
        
        const progress = Math.round((fileState.receivedChunksCount / fileState.metadata.totalChunks) * 100);
        this.callbacks.onFileProgress({
            fileId,
            fileName: fileState.metadata.name,
            fileSize: fileState.metadata.size,
            fileType: fileState.metadata.type,
            progress,
            transferredChunks: fileState.receivedChunksCount,
            totalChunks: fileState.metadata.totalChunks,
        });
    }
    
    private handleTransferComplete(fileId: string) {
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState) return;

        const missingChunks = fileState.chunks
            .map((chunk, index) => (chunk === null ? index : -1))
            .filter(index => index !== -1);
            
        if (missingChunks.length > 0) {
            this.callbacks.onStatusUpdate({ type: 'info', message: `Found ${missingChunks.length} missing chunks. Requesting re-transmission...`});
            this.sendMessage({ type: 'request-chunks', payload: { fileId, indexes: missingChunks } });
        } else {
            this.reconstructFile(fileId);
        }
    }

    private async reconstructFile(fileId: string) {
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState || fileState.chunks.some(c => c === null)) {
            this.callbacks.onStatusUpdate({ type: 'error', message: `File reconstruction for ${fileState?.metadata.name} failed: missing chunks.` });
            return;
        };

        const fileBlob = new Blob(fileState.chunks as BlobPart[]);
        const fullFileChecksum = await calculateSHA256(fileBlob);

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
            this.callbacks.onStatusUpdate({ type: 'error', message: `Final file checksum mismatch for ${fileState.metadata.name}. Transfer failed.`, code: 'CHECKSUM_MISMATCH', context: { fileName: fileState.metadata.name, fileId } });
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