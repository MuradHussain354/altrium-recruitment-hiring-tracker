import crypto from 'crypto';
import { AppError } from './errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Resolves and validates the AES-256 encryption key from the environment
 * or an optional provided override (used for testing).
 * Key must be exactly 32 bytes (or 64 hexadecimal characters).
 */
export function getEncryptionKey(overrideKey?: string): Buffer {
  const rawKey = overrideKey ?? process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new AppError(500, 'TWO_FACTOR_ENCRYPTION_KEY environment variable is not configured.');
  }

  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    keyBuffer = Buffer.from(rawKey, 'hex');
  } else if (Buffer.byteLength(rawKey, 'utf8') === 32) {
    keyBuffer = Buffer.from(rawKey, 'utf8');
  } else {
    throw new AppError(
      500,
      'Invalid TWO_FACTOR_ENCRYPTION_KEY: Must be exactly 32 bytes (or 64 hexadecimal characters).'
    );
  }

  return keyBuffer;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encrypt(plaintext: string, overrideKey?: string): string {
  const key = getEncryptionKey(overrideKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts ciphertext formatted as <iv_hex>:<auth_tag_hex>:<ciphertext_hex> using AES-256-GCM.
 * Throws AppError if authentication tag fails verification or data is tampered with.
 */
export function decrypt(encryptedData: string, overrideKey?: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new AppError(500, 'Invalid encrypted data format.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  if (!ivHex || !authTagHex || ciphertextHex === undefined) {
    throw new AppError(500, 'Corrupt encrypted data components.');
  }

  const key = getEncryptionKey(overrideKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new AppError(500, 'Corrupt IV or authentication tag length.');
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_error: any) {
    throw new AppError(500, 'Failed to decrypt data: Authentication tag verification failed.');
  }
}
