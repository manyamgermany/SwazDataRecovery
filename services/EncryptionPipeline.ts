import {
  generateEcdhKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptData,
  decryptData,
} from './cryptoService';

/**
 * Manages the end-to-end encryption workflow for a single file transfer session.
 * This class ensures that cryptographic keys are ephemeral and that a strong,
 * unique session key is derived for each peer-to-peer connection.
 */
export class EncryptionPipeline {
  private localKeyPair: CryptoKeyPair | null = null;
  private sharedSessionKey: CryptoKey | null = null;

  /**
   * Initializes the pipeline by generating a new, ephemeral ECDH key pair
   * for the current session and exporting the public key for sharing.
   * @returns A promise that resolves with the local public key in JWK format.
   */
  public async initialize(): Promise<JsonWebKey> {
    this.localKeyPair = await generateEcdhKeyPair();
    if (!this.localKeyPair.publicKey) {
      throw new Error('Failed to generate a valid public key.');
    }
    return exportPublicKey(this.localKeyPair.publicKey);
  }

  /**
   * Derives a shared, symmetric AES-256-GCM key for the session using the
   * local private key and the received public key from the peer.
   * @param remotePublicKeyJwk The public key of the peer, in JWK format.
   * @returns A promise that resolves when the shared key has been derived.
   */
  public async deriveSharedSecret(remotePublicKeyJwk: JsonWebKey): Promise<void> {
    if (!this.localKeyPair?.privateKey) {
      throw new Error('Local key pair is not initialized. Call initialize() first.');
    }
    const remotePublicKey = await importPublicKey(remotePublicKeyJwk);
    this.sharedSessionKey = await deriveSharedSecret(
      this.localKeyPair.privateKey,
      remotePublicKey
    );
  }

  /**
   * Encrypts a chunk of data using the derived session key.
   * Throws an error if the session key has not been derived yet.
   * @param data The plaintext ArrayBuffer to encrypt.
   * @returns A promise that resolves with the encrypted ArrayBuffer.
   */
  public async encrypt(data: ArrayBuffer): Promise<ArrayBuffer | null> {
    if (!this.sharedSessionKey) {
      console.error('Encryption error: Shared session key is not available.');
      return null;
    }
    return encryptData(data, this.sharedSessionKey);
  }

  /**
   * Decrypts a chunk of data using the derived session key.
   * Throws an error if the session key has not been derived yet.
   * @param encryptedData The encrypted ArrayBuffer to decrypt.
   * @returns A promise that resolves with the decrypted plaintext ArrayBuffer.
   */
  public async decrypt(encryptedData: ArrayBuffer): Promise<ArrayBuffer | null> {
    if (!this.sharedSessionKey) {
      console.error('Decryption error: Shared session key is not available.');
      return null;
    }
    try {
      return await decryptData(encryptedData, this.sharedSessionKey);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Checks if the secure channel is ready for data transmission.
   * @returns `true` if the shared session key has been derived, `false` otherwise.
   */
  public isReady(): boolean {
    return !!this.sharedSessionKey;
  }
}
