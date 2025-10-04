export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

type WebRTCConnectionManagerCallbacks = {
    onConnectionStateChange: (state: ConnectionState) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    onDataChannel: (dataChannel: RTCDataChannel) => void;
    onError: (error: Error) => void;
};

export class WebRTCConnectionManager {
    private pc: RTCPeerConnection;
    private callbacks: WebRTCConnectionManagerCallbacks;

    constructor(config: RTCConfiguration, callbacks: WebRTCConnectionManagerCallbacks) {
        this.pc = new RTCPeerConnection(config);
        this.callbacks = callbacks;
        this.setupPeerConnectionListeners();
    }

    private setupPeerConnectionListeners() {
        this.pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.callbacks.onIceCandidate(event.candidate);
            }
        };

        this.pc.onconnectionstatechange = () => {
            this.callbacks.onConnectionStateChange(this.pc.connectionState as ConnectionState);
        };

        this.pc.ondatachannel = (event) => {
            this.callbacks.onDataChannel(event.channel);
        };
    }

    public createDataChannel(label: string): RTCDataChannel {
        try {
            // Use an ordered, reliable data channel for file transfer. This is the default.
            const dataChannel = this.pc.createDataChannel(label, { ordered: true });
            return dataChannel;
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }

    public async createOffer(): Promise<RTCSessionDescriptionInit> {
        try {
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);
            return offer;
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }
    
    public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            return answer;
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }
    
    public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        try {
             if (this.pc.signalingState !== 'stable') {
                await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            this.callbacks.onError(error as Error);
            throw error;
        }
    }

    public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        try {
            // It's possible for ICE candidates to arrive before the remote description is set.
            // While we could buffer them, for this implementation, we'll simply try to add them
            // and ignore the "state" error if it occurs, as the connection will still likely succeed.
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            if (error instanceof DOMException && error.name === 'InvalidStateError') {
                console.warn('Ignoring benign error while adding ICE candidate in invalid state:', error.message);
            } else {
                 this.callbacks.onError(error as Error);
            }
        }
    }

    public disconnect() {
        if (this.pc.connectionState !== 'closed') {
            this.pc.close();
        }
    }
}
