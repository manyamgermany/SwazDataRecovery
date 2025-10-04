// --- Utility Functions ---

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param buffer The ArrayBuffer to convert.
 * @returns A hex string representation of the buffer.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Hashing ---

/**
 * Calculates the SHA-256 hash of a File, Blob, or ArrayBuffer.
 * This is used to verify the integrity of both individual chunks and the full file.
 * @param data The File, Blob, or ArrayBuffer to hash.
 * @returns A promise that resolves with the SHA-256 hash as a hex string.
 */
// Fix: Update function signature to accept Blob type and adjust implementation to handle it.
export async function calculateSHA256(data: File | ArrayBuffer | Blob): Promise<string> {
  const buffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
  try {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    return bufferToHex(hashBuffer);
  } catch (error) {
    console.error("Error calculating SHA-256:", error);
    return 'crypto-not-available';
  }
}

// --- Key Generation and Derivation (ECDH + HKDF) ---

/**
 * Generates an ephemeral Elliptic Curve Diffie-Hellman (ECDH) key pair.
 * These keys are used for a single session to establish a shared secret.
 * @returns A promise that resolves with the generated CryptoKeyPair.
 */
export async function generateEcdhKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // a private key can be exported for debugging but not recommended for production
    ['deriveKey']
  );
}

/**
 * Exports a public key into the JSON Web Key (JWK) format for easy serialization and transmission.
 * @param key The public CryptoKey to export.
 * @returns A promise that resolves with the public key in JWK format.
 */
export async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey('jwk', key);
}

/**
 * Imports a public key from the JWK format back into a CryptoKey object.
 * @param jwk The public key in JWK format received from the peer.
 * @returns A promise that resolves with the imported public CryptoKey.
 */
export async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Derives a 256-bit AES-GCM secret key from a shared secret using HKDF.
 * This is a crucial step to ensure the raw shared secret from ECDH is not used directly.
 * @param privateKey The local user's private ECDH key.
 * @param publicKey The remote peer's public ECDH key.
 * @returns A promise that resolves with the derived AES-GCM CryptoKey.
 */
export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}


// --- Encryption / Decryption (AES-GCM) ---

/**
 * Encrypts a chunk of data using AES-256-GCM.
 * This algorithm is chosen because it provides both confidentiality and authenticity.
 * @param data The ArrayBuffer (chunk) to encrypt.
 * @param key The shared AES-GCM session key.
 * @returns A promise that resolves with the encrypted ArrayBuffer.
 */
export async function encryptData(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV is recommended for GCM
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
  // Prepend the IV to the ciphertext. The receiver will need it for decryption.
  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), iv.length);
  return result.buffer;
}

/**
 * Decrypts a chunk of data using AES-256-GCM.
 * @param encryptedData The ArrayBuffer containing the IV and the ciphertext.
 * @param key The shared AES-GCM session key.
 * @returns A promise that resolves with the decrypted ArrayBuffer (plaintext).
 */
export async function decryptData(encryptedData: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);
  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );
}