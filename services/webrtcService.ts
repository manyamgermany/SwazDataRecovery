
import { WebRTCConnectionManager } from './WebRTCConnectionManager';
import { calculateSHA256 } from './cryptoService';
import { EncryptionPipeline } from './EncryptionPipeline';

// Constants for backpressure mechanism
const HIGH_WATER_MARK = 15 * 1024 * 1024; // 15 MB buffer
const LOW_WATER_MARK = 8 * 1024 * 1024; // 8 MB buffer

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
};
type ProtocolMessage = 
    | { type: 'file-metadata', payload: FileMetadata }
    | { type: 'chunk-metadata', payload: ChunkMetadata } // Explicitly for receiver side type guarding
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
    private readonly chunkSize = 64 * 1024; // 64 KB chunks

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
        // Set threshold for backpressure events
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
        // The streaming loop will automatically continue
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
        const { totalChunks, fileId, name } = metadata;

        for (let i = this.sendingFileState.sentChunksCount; i < totalChunks; i++) {
            // Handle pausing
            while (this.isPaused) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // Handle cancellation (e.g., peer disconnects and state is reset)
            if (!this.sendingFileState || this.sendingFileState.metadata.fileId !== fileId) {
                this.callbacks.onStatusUpdate({ type: 'info', message: `Transfer of ${name} was cancelled.` });
                return;
            }

            // Handle backpressure to adapt to network conditions
            if (this.dataChannel.bufferedAmount > HIGH_WATER_MARK) {
                await this.waitForBufferToClear();
            }

            const start = i * this.chunkSize;
            const end = start + this.chunkSize;
            const chunkBlob = file.slice(start, end);
            const chunkData = await chunkBlob.arrayBuffer();

            const chunkMetadata: ChunkMetadata = { fileId, chunkIndex: i, size: chunkData.byteLength };

            const encryptedChunk = await this.encryptionPipeline.encrypt(chunkData);
            if (!encryptedChunk) {
                this.callbacks.onStatusUpdate({ type: 'error', message: `Encryption failed for chunk ${i + 1} of ${name}.` });
                this.webRTCManager.disconnect(); // Fatal error, kill connection
                return;
            }

            this.sendMessage({ type: 'chunk-metadata', payload: chunkMetadata });
            this.dataChannel.send(encryptedChunk);

            this.sendingFileState.sentChunksCount++;
            
            const progress = Math.round((this.sendingFileState.sentChunksCount / totalChunks) * 100);
            this.callbacks.onFileProgress({ fileId, fileName: name, progress });
        }
    }

    private waitForBufferToClear(): Promise<void> {
        return new Promise(resolve => {
            if (!this.dataChannel) {
                resolve();
                return;
            }
            // This event fires when the buffer drops below the `bufferedAmountLowThreshold`
            const onBufferLow = () => {
                this.dataChannel?.removeEventListener('bufferedamountlow', onBufferLow);
                resolve();
            };
            this.dataChannel.addEventListener('bufferedamountlow', onBufferLow);
        });
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
        const { fileId, chunkIndex } = metadata;
        const fileState = this.receivingFiles.get(fileId);
        if (!fileState) return;

        if (!fileState.chunks[chunkIndex]) {
            fileState.chunks[chunkIndex] = decryptedChunkData;
            fileState.receivedChunksCount++;
        }
        
        const progress = Math.round((fileState.receivedChunksCount / fileState.metadata.totalChunks) * 100);
        this.callbacks.onFileProgress({ fileId, fileName: fileState.metadata.name, progress });

        if (fileState.receivedChunksCount === fileState.metadata.totalChunks) {
            this.reconstructFile(fileId);
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
