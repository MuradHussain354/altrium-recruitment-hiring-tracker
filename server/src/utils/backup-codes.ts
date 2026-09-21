import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;
const DEFAULT_CODE_COUNT = 8;
const CODE_BYTE_LENGTH = 4; // 4 bytes = 8 hex characters

export interface GeneratedBackupCodes {
  plaintextCodes: string[]; // Returned only once to display to the user
  hashedCodes: string[];    // Safe to persist in the database
}

/**
 * Normalizes a backup code by removing hyphens and whitespace, and converting to uppercase.
 */
export function normalizeBackupCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return '';
  }
  return code.trim().replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Generates cryptographically secure single-use backup codes.
 * Returns both plaintext codes (to display once to the user) and
 * bcrypt-hashed codes (to store in the database).
 * Plaintext codes are formatted with a hyphen for readability (e.g., "A1B2-C3D4").
 */
export async function generateBackupCodes(
  count: number = DEFAULT_CODE_COUNT
): Promise<GeneratedBackupCodes> {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 4 random bytes -> 8 hex characters
    const hex = crypto.randomBytes(CODE_BYTE_LENGTH).toString('hex').toUpperCase();
    const formatted = `${hex.slice(0, 4)}-${hex.slice(4)}`;
    const normalized = normalizeBackupCode(formatted);

    const hash = await bcrypt.hash(normalized, BCRYPT_SALT_ROUNDS);

    plaintextCodes.push(formatted);
    hashedCodes.push(hash);
  }

  return {
    plaintextCodes,
    hashedCodes,
  };
}

/**
 * Verifies a submitted plaintext backup code against a stored bcrypt hash.
 * Handles both hyphenated ("A1B2-C3D4") and unhyphenated ("A1B2C3D4") input.
 * Never logs the submitted code.
 */
export async function verifyBackupCode(
  submittedCode: string,
  codeHash: string
): Promise<boolean> {
  if (!submittedCode || !codeHash) {
    return false;
  }

  const normalized = normalizeBackupCode(submittedCode);
  if (normalized.length !== 8) {
    return false;
  }

  return bcrypt.compare(normalized, codeHash);
}
