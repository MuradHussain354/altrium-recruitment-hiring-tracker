import crypto from 'crypto';
import { AppError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128-bit authentication tag

function getEmailEncryptionKey(): Buffer {
  const key = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new AppError(500, 'EMAIL_TOKEN_ENCRYPTION_KEY environment variable is not defined.');
  }

  // Support 64-hex-character string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Support raw 32-character UTF-8 string (32 bytes)
  if (Buffer.byteLength(key, 'utf8') === 32) {
    return Buffer.from(key, 'utf8');
  }

  throw new AppError(
    500,
    'EMAIL_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters or a 32-character UTF-8 string).'
  );
}

/**
 * Encrypts an email invitation token using AES-256-GCM.
 * Serialized output format: "ivHex:authTagHex:ciphertextHex"
 */
export function encryptEmailToken(plaintext: string): string {
  if (!plaintext) {
    throw new AppError(500, 'Cannot encrypt empty email token.');
  }

  const key = getEmailEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH_BYTES });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted email invitation token using AES-256-GCM.
 * Authenticated decryption: rejects tampered ciphertext or invalid tags.
 */
export function decryptEmailToken(encryptedPayload: string): string {
  if (!encryptedPayload) {
    throw new AppError(500, 'Cannot decrypt empty email token payload.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new AppError(500, 'Invalid email token ciphertext format.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEmailEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new AppError(500, 'Invalid email token encryption parameters.');
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH_BYTES });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_err) {
    throw new AppError(500, 'Failed to authenticate and decrypt email token material.');
  }
}
