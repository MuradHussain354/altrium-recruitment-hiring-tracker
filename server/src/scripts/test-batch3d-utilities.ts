import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import { encrypt, decrypt, getEncryptionKey } from '../utils/crypto';
import { generateTotpSecret, generateQrCodeDataUrl, verifyTotpToken } from '../utils/totp';
import { generateBackupCodes, verifyBackupCode, normalizeBackupCode } from '../utils/backup-codes';
import { AppError } from '../utils/errors';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('==================================================');
  console.log('STARTING BATCH 3D PHASE 1 SECURITY UTILITIES TEST SUITE');
  console.log('==================================================\n');

  const valid64HexKey = crypto.randomBytes(32).toString('hex');
  const valid32CharKey = '12345678901234567890123456789012';

  // ──────────────────────────────────────────────
  // 1. AES-256-GCM CRYPTO UTILITY TESTS
  // ──────────────────────────────────────────────
  console.log('--- 1. AES-256-GCM Cryptography Tests ---');

  // Test 1.1: Key validation with 64-hex key
  const keyBuf1 = getEncryptionKey(valid64HexKey);
  assert(keyBuf1.length === 32, '1.1 64-hex key parses into exactly 32 bytes Buffer');

  // Test 1.2: Key validation with 32-character utf8 key
  const keyBuf2 = getEncryptionKey(valid32CharKey);
  assert(keyBuf2.length === 32, '1.2 32-char key parses into exactly 32 bytes Buffer');

  // Test 1.3: Reject missing key
  try {
    getEncryptionKey('');
    assert(false, '1.3 Empty key must throw error');
  } catch (err: any) {
    assert(err instanceof AppError && err.statusCode === 500, '1.3 Missing key throws AppError(500)');
  }

  // Test 1.4: Reject invalid key length (short key)
  try {
    getEncryptionKey('too-short-key');
    assert(false, '1.4 Short key must throw error');
  } catch (err: any) {
    assert(err instanceof AppError && err.statusCode === 500, '1.4 Short key throws AppError(500)');
  }

  // Test 1.5: Reject invalid key length (63 hex chars)
  try {
    getEncryptionKey(valid64HexKey.slice(0, 63));
    assert(false, '1.5 63-hex key must throw error');
  } catch (err: any) {
    assert(err instanceof AppError && err.statusCode === 500, '1.5 63-hex key throws AppError(500)');
  }

  // Test 1.6: Encrypt / Decrypt round trip
  const sampleSecret = 'JBSWY3DPEHPK3PXP';
  const encrypted = encrypt(sampleSecret, valid64HexKey);
  assert(typeof encrypted === 'string' && encrypted.split(':').length === 3, '1.6 Encrypted format matches iv:authTag:ciphertext');

  const decrypted = decrypt(encrypted, valid64HexKey);
  assert(decrypted === sampleSecret, '1.7 Decrypted plaintext exactly matches original secret');

  // Test 1.8: Round trip with complex unicode & json
  const jsonPayload = JSON.stringify({ userId: 'u123', email: 'test@altrium.local', role: 'Manager' });
  const encryptedJson = encrypt(jsonPayload, valid32CharKey);
  const decryptedJson = decrypt(encryptedJson, valid32CharKey);
  assert(decryptedJson === jsonPayload, '1.8 Complex JSON payload decrypts with exact fidelity');

  // Test 1.9: Tampering with ciphertext fails authentication
  const [iv, tag, cipher] = encrypted.split(':');
  const tamperedCipher = cipher.slice(0, -2) + (cipher.slice(-2) === '00' ? 'ff' : '00');
  try {
    decrypt(`${iv}:${tag}:${tamperedCipher}`, valid64HexKey);
    assert(false, '1.9 Tampered ciphertext must fail decryption');
  } catch (err: any) {
    assert(err instanceof AppError && err.message.includes('Authentication tag verification failed'), '1.9 Tampered ciphertext throws authentication error');
  }

  // Test 1.10: Tampering with auth tag fails authentication
  const tamperedTag = tag.slice(0, -2) + (tag.slice(-2) === '00' ? 'ff' : '00');
  try {
    decrypt(`${iv}:${tamperedTag}:${cipher}`, valid64HexKey);
    assert(false, '1.10 Tampered authTag must fail decryption');
  } catch (err: any) {
    assert(err instanceof AppError && err.message.includes('Authentication tag verification failed'), '1.10 Tampered authTag throws authentication error');
  }

  // Test 1.11: Tampering with IV fails authentication
  const tamperedIv = iv.slice(0, -2) + (iv.slice(-2) === '00' ? 'ff' : '00');
  try {
    decrypt(`${tamperedIv}:${tag}:${cipher}`, valid64HexKey);
    assert(false, '1.11 Tampered IV must fail decryption');
  } catch (err: any) {
    assert(err instanceof AppError && err.message.includes('Authentication tag verification failed'), '1.11 Tampered IV throws authentication error');
  }

  // Test 1.12: Decrypting with wrong key fails
  const wrongKey = crypto.randomBytes(32).toString('hex');
  try {
    decrypt(encrypted, wrongKey);
    assert(false, '1.12 Decrypting with wrong key must fail');
  } catch (err: any) {
    assert(err instanceof AppError, '1.12 Decrypting with wrong key throws authentication error');
  }

  // ──────────────────────────────────────────────
  // 2. TOTP UTILITY TESTS
  // ──────────────────────────────────────────────
  console.log('\n--- 2. TOTP Generation and Verification Tests ---');

  // Test 2.1: TOTP secret generation
  const testEmail = 'staff.member@altrium.local';
  const enrollment = generateTotpSecret(testEmail);
  assert(!!enrollment.secret && enrollment.secret.length >= 16, '2.1 TOTP secret generated with adequate length');
  assert(enrollment.uri.startsWith('otpauth://totp/Altrium:'), '2.2 otpauth URI starts with correct issuer prefix');
  assert(enrollment.uri.includes(encodeURIComponent(testEmail)), '2.3 otpauth URI contains user email');
  assert(enrollment.uri.includes(enrollment.secret), '2.4 otpauth URI embeds the generated secret');

  // Test 2.2: QR Code generation
  const qrDataUrl = await generateQrCodeDataUrl(enrollment.uri);
  assert(qrDataUrl.startsWith('data:image/png;base64,'), '2.5 QR code generated as valid base64 PNG data URL');

  // Test 2.3: Valid TOTP generation and verification
  const otpauthTotp = new OTPAuth.TOTP({
    issuer: 'Altrium',
    label: testEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(enrollment.secret),
  });
  const currentToken = otpauthTotp.generate();
  assert(/^\d{6}$/.test(currentToken), '2.6 Generated test TOTP is 6 numeric digits');

  const isValid = verifyTotpToken(currentToken, enrollment.secret);
  assert(isValid === true, '2.7 verifyTotpToken successfully validates current TOTP code');

  // Test 2.4: Code with spaces/hyphens accepted through normalization
  const spacedToken = `${currentToken.slice(0, 3)} ${currentToken.slice(3)}`;
  const isValidSpaced = verifyTotpToken(spacedToken, enrollment.secret);
  assert(isValidSpaced === true, '2.8 verifyTotpToken handles formatted tokens with spaces');

  // Test 2.5: Invalid 6-digit code rejected
  const invalidToken = currentToken === '123456' ? '654321' : '123456';
  // Note: could randomly match in 1/1,000,000, so verify explicitly:
  const isInvalidRejected = !verifyTotpToken('999999', enrollment.secret) || !verifyTotpToken('000000', enrollment.secret);
  assert(isInvalidRejected, '2.9 verifyTotpToken rejects invalid 6-digit code');

  // Test 2.6: Malformed tokens rejected
  assert(verifyTotpToken('12345', enrollment.secret) === false, '2.10 Rejects 5-digit code');
  assert(verifyTotpToken('1234567', enrollment.secret) === false, '2.11 Rejects 7-digit code');
  assert(verifyTotpToken('abcdef', enrollment.secret) === false, '2.12 Rejects non-numeric token');
  assert(verifyTotpToken('', enrollment.secret) === false, '2.13 Rejects empty token');

  // ──────────────────────────────────────────────
  // 3. BACKUP CODES UTILITY TESTS
  // ──────────────────────────────────────────────
  console.log('\n--- 3. Backup Code Generation and Verification Tests ---');

  // Test 3.1: Generation of default count (8 codes)
  const { plaintextCodes, hashedCodes } = await generateBackupCodes(8);
  assert(plaintextCodes.length === 8, '3.1 Exactly 8 plaintext backup codes generated');
  assert(hashedCodes.length === 8, '3.2 Exactly 8 hashed backup codes generated');

  // Test 3.2: Plaintext format check
  const allFormatted = plaintextCodes.every((c) => /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(c));
  assert(allFormatted, '3.3 All plaintext backup codes formatted as XXXX-XXXX (hex uppercase)');

  // Test 3.3: Codes are unique
  const uniqueSet = new Set(plaintextCodes);
  assert(uniqueSet.size === 8, '3.4 All 8 generated backup codes are cryptographically unique');

  // Test 3.4: Hashed codes are valid bcrypt hashes
  const allBcryptHashes = hashedCodes.every((h) => h.startsWith('$2a$') || h.startsWith('$2b$'));
  assert(allBcryptHashes, '3.5 All backup code hashes are valid bcrypt strings');

  // Test 3.5: Verifying a matching backup code
  const codeIndex = 0;
  const matchResult = await verifyBackupCode(plaintextCodes[codeIndex], hashedCodes[codeIndex]);
  assert(matchResult === true, '3.6 verifyBackupCode returns true for valid matching code');

  // Test 3.6: Verifying without hyphen
  const unhyphenated = plaintextCodes[codeIndex].replace('-', '');
  const unhyphenatedMatch = await verifyBackupCode(unhyphenated, hashedCodes[codeIndex]);
  assert(unhyphenatedMatch === true, '3.7 verifyBackupCode matches unhyphenated input (case/punctuation insensitive)');

  // Test 3.7: Verifying lowercase
  const lowercaseCode = plaintextCodes[codeIndex].toLowerCase();
  const lowercaseMatch = await verifyBackupCode(lowercaseCode, hashedCodes[codeIndex]);
  assert(lowercaseMatch === true, '3.8 verifyBackupCode matches lowercase input');

  // Test 3.8: Non-matching code rejected
  const mismatchResult = await verifyBackupCode('DEAD-BEEF', hashedCodes[codeIndex]);
  assert(mismatchResult === false, '3.9 verifyBackupCode returns false for non-matching code');

  // Test 3.9: Empty or corrupt input rejected
  const emptyResult = await verifyBackupCode('', hashedCodes[codeIndex]);
  assert(emptyResult === false, '3.10 verifyBackupCode returns false for empty input');

  // Test 3.10: Plaintext codes are not stored inside hashed array
  const noPlaintextInHashes = hashedCodes.every((h) => !plaintextCodes.includes(h));
  assert(noPlaintextInHashes, '3.11 Hashed array contains zero plaintext values');

  console.log('\n==================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('UNEXPECTED TEST EXCEPTION:', err);
  process.exit(1);
});
