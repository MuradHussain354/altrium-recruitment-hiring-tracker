import dotenv from 'dotenv';
dotenv.config();

// Ensure test environment variables are set before any module initialization
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/altrium_recruitment?schema=public';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_for_batch3d_verification_12345';
}
if (!process.env.TWO_FACTOR_ENCRYPTION_KEY) {
  process.env.TWO_FACTOR_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

import http from 'http';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import jwt from 'jsonwebtoken';
import app from '../app';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';
import { decrypt } from '../utils/crypto';
import { signToken, verify2FATempToken } from '../utils/jwt';

async function runBatch3DAuthTests() {
  console.log('======================================================================');
  console.log('STARTING SPRINT 2 BATCH 3D — AUTHENTICATION & 2FA BACKEND TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // In-memory data store for deterministic mock testing
  const store = {
    users: new Map<string, any>(),
    backupCodes: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  // Setup mock Prisma operations
  (prisma as any).$transaction = async (arg: any) => {
    if (typeof arg === 'function') {
      return await arg(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  };

  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.id) {
      return store.users.get(where.id) || null;
    }
    if (where.email) {
      for (const u of store.users.values()) {
        if (u.email.toLowerCase() === where.email.toLowerCase()) {
          return { ...u };
        }
      }
      return null;
    }
    return null;
  };

  (prisma.user as any).update = async ({ where, data }: any) => {
    const u = store.users.get(where.id);
    if (!u) throw new Error('User not found in mock store');
    const updated = { ...u, ...data };
    store.users.set(where.id, updated);
    return { ...updated };
  };

  (prisma.twoFactorBackupCode as any).findMany = async ({ where }: any) => {
    const results: any[] = [];
    for (const bc of store.backupCodes.values()) {
      if (bc.userId === where.userId) {
        if (where.usedAt === null && bc.usedAt !== null) {
          continue;
        }
        results.push({ ...bc });
      }
    }
    return results;
  };

  (prisma.twoFactorBackupCode as any).deleteMany = async ({ where }: any) => {
    let count = 0;
    for (const [id, bc] of store.backupCodes.entries()) {
      if (bc.userId === where.userId) {
        store.backupCodes.delete(id);
        count++;
      }
    }
    return { count };
  };

  (prisma.twoFactorBackupCode as any).createMany = async ({ data }: any) => {
    let count = 0;
    for (const item of data) {
      const id = 'bc-' + Math.random().toString(36).slice(2, 9);
      store.backupCodes.set(id, { id, usedAt: null, createdAt: new Date(), ...item });
      count++;
    }
    return { count };
  };

  (prisma.twoFactorBackupCode as any).updateMany = async ({ where, data }: any) => {
    let count = 0;
    for (const [id, bc] of store.backupCodes.entries()) {
      if (id === where.id) {
        if (where.usedAt === null && bc.usedAt !== null) {
          // Already used: CAS failure
          continue;
        }
        store.backupCodes.set(id, { ...bc, ...data });
        count++;
      }
    }
    return { count };
  };

  (prisma.twoFactorBackupCode as any).count = async ({ where }: any) => {
    let count = 0;
    for (const bc of store.backupCodes.values()) {
      if (bc.userId === where.userId) {
        if (where.usedAt === null && bc.usedAt !== null) continue;
        count++;
      }
    }
    return count;
  };

  (prisma.auditLog as any).create = async ({ data }: any) => {
    const id = 'audit-' + Math.random().toString(36).slice(2, 9);
    const record = { id, timestamp: new Date(), ...data };
    store.auditLogs.set(id, record);
    return record;
  };

  (prisma.auditLog as any).findMany = async () => {
    return Array.from(store.auditLogs.values());
  };

  // Start ephemeral HTTP server for API contract verification
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  const request = async (
    path: string,
    options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}
  ) => {
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (options.token) {
      reqHeaders['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: reqHeaders,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  try {
    // Seed test users in mock store
    const testPassword = 'SecurePassword123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const userStandard = {
      id: 'user-standard-1',
      name: 'Standard HR User',
      email: 'hr.standard@altrium.local',
      passwordHash,
      role: Role.HR,
      isActive: true,
      teamId: null,
      createdById: null,
      createdAt: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorTempExpiresAt: null,
    };

    const user2FA = {
      id: 'user-2fa-1',
      name: 'Manager With 2FA',
      email: 'manager.2fa@altrium.local',
      passwordHash,
      role: Role.Manager,
      isActive: true,
      teamId: null,
      createdById: null,
      createdAt: new Date(),
      twoFactorEnabled: false, // will enable during test
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      twoFactorTempExpiresAt: null,
    };

    store.users.set(userStandard.id, userStandard);
    store.users.set(user2FA.id, user2FA);

    // ──────────────────────────────────────────────────────────────────
    // GROUP A: LOGIN & ANTI-ENUMERATION
    // ──────────────────────────────────────────────────────────────────
    console.log('--- GROUP A: Login & Anti-Enumeration ---');

    // A.1: Unknown email returns generic 401
    const tA1 = await request('/auth/login', {
      method: 'POST',
      body: { email: 'nonexistent@altrium.local', password: testPassword },
    });
    assert(tA1.status === 401, 'A.1 Unknown email returns 401 Unauthorized');
    assert(tA1.data?.error === 'Unauthorized', 'A.1 Response error is Unauthorized');
    assert(tA1.data?.message === 'Invalid email or password.', 'A.1 Response message is generic');

    // A.2: Existing user with wrong password returns IDENTICAL response
    const tA2 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: 'WrongPassword999!' },
    });
    assert(tA2.status === 401, 'A.2 Wrong password returns 401 Unauthorized');
    assert(tA2.data?.error === 'Unauthorized', 'A.2 Wrong password error is Unauthorized');
    assert(tA2.data?.message === 'Invalid email or password.', 'A.2 Wrong password message matches unknown email exactly');
    assert(JSON.stringify(tA1.data) === JSON.stringify(tA2.data), 'A.2 Payload response is bitwise identical (no enumeration)');

    // A.3: Successful login with 2FA disabled
    const tA3 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    assert(tA3.status === 200, 'A.3 Successful login returns 200 OK');
    assert(tA3.data?.requires2FA === false, 'A.3 requires2FA is false');
    assert(typeof tA3.data?.token === 'string' && tA3.data?.token.length > 20, 'A.3 Returns valid JWT access token');
    assert(tA3.data?.user?.email === userStandard.email, 'A.3 Returns correct user email');
    assert(tA3.data?.user?.passwordHash === undefined, 'A.3 User profile does NOT leak passwordHash');

    const standardUserToken = tA3.data.token;

    // ──────────────────────────────────────────────────────────────────
    // GROUP B: 2FA SETUP FLOW
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP B: 2FA Setup Flow ---');

    // B.1: Unauthenticated request to setup is rejected
    const tB1 = await request('/auth/2fa/setup', { method: 'POST' });
    assert(tB1.status === 401, 'B.1 Unauthenticated 2FA setup rejected with 401');

    // B.2: Authenticated 2FA setup generates enrollment info
    const tB2 = await request('/auth/2fa/setup', {
      method: 'POST',
      token: standardUserToken,
    });
    assert(tB2.status === 200, 'B.2 Authenticated 2FA setup returns 200 OK');
    assert(typeof tB2.data?.qrCodeUrl === 'string' && tB2.data?.qrCodeUrl.startsWith('data:image/png;base64,'), 'B.2 Generates valid QR code data URL');
    assert(typeof tB2.data?.otpauthUri === 'string' && tB2.data?.otpauthUri.startsWith('otpauth://totp/Altrium:'), 'B.2 Generates valid otpauth URI');
    assert(typeof tB2.data?.manualKey === 'string' && tB2.data?.manualKey.length >= 16, 'B.2 Generates manual Base32 setup key');

    // B.3: Verify database state after setup
    const userInDbAfterSetup = store.users.get(userStandard.id);
    assert(userInDbAfterSetup.twoFactorEnabled === false, 'B.3 2FA is NOT immediately enabled after setup');
    assert(!!userInDbAfterSetup.twoFactorTempSecret, 'B.3 Temporary secret is stored in database');
    assert(userInDbAfterSetup.twoFactorTempSecret !== tB2.data.manualKey, 'B.3 Temporary secret is stored ENCRYPTED (never plaintext)');
    assert(userInDbAfterSetup.twoFactorTempExpiresAt instanceof Date, 'B.3 Temporary expiry is populated');

    // Decrypting temp secret gives the manual key
    const decryptedTemp = decrypt(userInDbAfterSetup.twoFactorTempSecret);
    assert(decryptedTemp === tB2.data.manualKey, 'B.3 Decrypted temp secret matches manual setup key exactly');

    // ──────────────────────────────────────────────────────────────────
    // GROUP C: 2FA ENABLEMENT
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP C: 2FA Enablement ---');

    // C.1: Invalid TOTP code rejected
    const tC1 = await request('/auth/2fa/enable', {
      method: 'POST',
      token: standardUserToken,
      body: { code: '000000' },
    });
    assert(tC1.status === 401, 'C.1 Invalid TOTP code rejected with 401');
    assert(store.users.get(userStandard.id).twoFactorEnabled === false, 'C.1 2FA remains disabled after failed verification');

    // C.2: Expired setup rejected
    const expiredUser = { ...store.users.get(userStandard.id), twoFactorTempExpiresAt: new Date(Date.now() - 1000) };
    store.users.set(userStandard.id, expiredUser);
    const tC2 = await request('/auth/2fa/enable', {
      method: 'POST',
      token: standardUserToken,
      body: { code: '123456' },
    });
    assert(tC2.status === 400, 'C.2 Expired setup rejected with 400 Bad Request');
    assert(tC2.data?.message.includes('expired'), 'C.2 Error message indicates expiration');

    // Re-initiate setup for valid enable test
    const tCSetup = await request('/auth/2fa/setup', {
      method: 'POST',
      token: standardUserToken,
    });
    const currentManualKey = tCSetup.data.manualKey;

    // Generate valid TOTP using OTPAuth
    const totpGenerator = new OTPAuth.TOTP({
      issuer: 'Altrium',
      label: userStandard.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(currentManualKey),
    });
    const validTotpCode = totpGenerator.generate();

    // C.3: Valid TOTP enables 2FA and returns 8 backup codes
    const tC3 = await request('/auth/2fa/enable', {
      method: 'POST',
      token: standardUserToken,
      body: { code: validTotpCode },
    });
    assert(tC3.status === 200, 'C.3 Valid TOTP enables 2FA with 200 OK');
    assert(Array.isArray(tC3.data?.backupCodes) && tC3.data?.backupCodes.length === 8, 'C.3 Returns exactly 8 plaintext backup codes');
    assert(!!tC3.data?.warning, 'C.3 Response includes warning about one-time display');

    const generatedBackupCodes: string[] = tC3.data.backupCodes;

    // C.4: Database verification after enablement
    const userAfterEnable = store.users.get(userStandard.id);
    assert(userAfterEnable.twoFactorEnabled === true, 'C.4 User twoFactorEnabled is now true');
    assert(!!userAfterEnable.twoFactorSecret, 'C.4 twoFactorSecret is populated');
    assert(userAfterEnable.twoFactorSecret !== currentManualKey, 'C.4 twoFactorSecret is stored ENCRYPTED');
    assert(userAfterEnable.twoFactorTempSecret === null, 'C.4 twoFactorTempSecret is cleared');
    assert(userAfterEnable.twoFactorTempExpiresAt === null, 'C.4 twoFactorTempExpiresAt is cleared');

    // C.5: Backup codes persisted only as bcrypt hashes
    const storedBackupCodes = Array.from(store.backupCodes.values()).filter((bc) => bc.userId === userStandard.id);
    assert(storedBackupCodes.length === 8, 'C.5 Exactly 8 backup codes stored in database');
    const allHashed = storedBackupCodes.every((bc) => bc.codeHash.startsWith('$2a$') || bc.codeHash.startsWith('$2b$'));
    assert(allHashed, 'C.5 All stored backup codes are bcrypt hashes');
    const noPlaintext = storedBackupCodes.every((bc) => !generatedBackupCodes.includes(bc.codeHash));
    assert(noPlaintext, 'C.5 Zero plaintext backup codes stored in database');

    // ──────────────────────────────────────────────────────────────────
    // GROUP D: LOGIN WITH 2FA ENABLED & TEMPORARY TOKEN SECURITY
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP D: Login With 2FA Enabled & Temporary Token Security ---');

    // D.1: Login with 2FA enabled returns temporary challenge token
    const tD1 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    assert(tD1.status === 200, 'D.1 Login returns 200 OK');
    assert(tD1.data?.requires2FA === true, 'D.1 requires2FA is true');
    assert(typeof tD1.data?.tempToken === 'string', 'D.1 Returns tempToken');
    assert(tD1.data?.token === undefined, 'D.1 Normal ACCESS token is NOT issued');

    const tempToken = tD1.data.tempToken;

    // D.2: Temporary token rejected by normal requireAuth (/auth/me)
    const tD2 = await request('/auth/me', {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(tD2.status === 401, 'D.2 /auth/me strictly rejects temporary 2FA token with 401');

    // D.3: Temporary token rejected by another protected endpoint (/users/me or /users)
    const tD3 = await request('/users/me', {
      headers: { Authorization: `Bearer ${tempToken}` },
    });
    assert(tD3.status === 401, 'D.3 Application endpoint strictly rejects temporary 2FA token with 401');

    // D.4: Malformed temp token rejected
    const tD4 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: 'malformed.token.here', code: '123456' },
    });
    assert(tD4.status === 401, 'D.4 Malformed temp token rejected with 401');

    // D.5: Expired temp token rejected
    const expiredTempToken = jwt.sign(
      { sub: userStandard.id, type: '2FA_PENDING', jti: 'test-expired' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1s' }
    );
    const tD5 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: expiredTempToken, code: '123456' },
    });
    assert(tD5.status === 401, 'D.5 Expired temp token rejected with 401');

    // D.6: ACCESS token passed to verify-login rejected
    const tD6 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: standardUserToken, code: '123456' },
    });
    assert(tD6.status === 401, 'D.6 Normal ACCESS token rejected by verify-login with 401');

    // ──────────────────────────────────────────────────────────────────
    // GROUP E: VERIFY 2FA LOGIN (TOTP & BACKUP CODES)
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP E: Verify 2FA Login (TOTP & Backup Codes) ---');

    // E.1: Invalid TOTP code rejected
    const tE1 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken, code: '999999' },
    });
    assert(tE1.status === 401, 'E.1 Invalid code rejected with 401');

    // E.2: Valid TOTP code logs in and issues normal ACCESS token
    const newTotpCode = totpGenerator.generate();
    const tE2 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken, code: newTotpCode },
    });
    assert(tE2.status === 200, 'E.2 Valid TOTP verification succeeds with 200 OK');
    assert(typeof tE2.data?.token === 'string', 'E.2 Normal ACCESS JWT issued upon successful 2FA verification');
    assert(tE2.data?.user?.email === userStandard.email, 'E.2 Returns correct user profile');

    const authenticated2FAToken = tE2.data.token;

    // Verify the newly issued token works with /auth/me
    const tE2Me = await request('/auth/me', { token: authenticated2FAToken });
    assert(tE2Me.status === 200, 'E.2 Newly issued token works with protected /auth/me');

    // E.3: Login with Backup Code
    // First, generate a fresh tempToken
    const loginForBackup = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    const tempTokenForBackup = loginForBackup.data.tempToken;

    const backupCodeToUse = generatedBackupCodes[0];
    const tE3 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: tempTokenForBackup, code: backupCodeToUse },
    });
    assert(tE3.status === 200, 'E.3 Valid backup code logs in successfully with 200 OK');
    assert(tE3.data?.usedBackupCode === true, 'E.3 Response indicates backup code was used');
    assert(typeof tE3.data?.token === 'string', 'E.3 Issues normal ACCESS JWT');

    // E.4: Single-use check: reused backup code is rejected
    const loginForReused = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    const tempTokenForReused = loginForReused.data.tempToken;

    const tE4 = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: tempTokenForReused, code: backupCodeToUse },
    });
    assert(tE4.status === 401, 'E.4 Used backup code strictly fails with 401');

    // E.5: Concurrent backup code consumption race safety
    const loginRace1 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    const loginRace2 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });

    const raceCode = generatedBackupCodes[1];
    const [raceRes1, raceRes2] = await Promise.all([
      request('/auth/2fa/verify-login', {
        method: 'POST',
        body: { tempToken: loginRace1.data.tempToken, code: raceCode },
      }),
      request('/auth/2fa/verify-login', {
        method: 'POST',
        body: { tempToken: loginRace2.data.tempToken, code: raceCode },
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(statuses[0] === 200 && statuses[1] === 401, 'E.5 Concurrent same-code requests result in exactly one 200 OK and one 401 Unauthorized (atomic single-use)');

    // E.6: Unused backup codes remain available
    const statusRes = await request('/auth/2fa/status', { token: authenticated2FAToken });
    assert(statusRes.status === 200, 'E.6 /auth/2fa/status returns 200 OK');
    assert(statusRes.data?.enabled === true, 'E.6 2FA is enabled in status response');
    assert(statusRes.data?.remainingBackupCodes === 6, 'E.6 Exactly 6 unused backup codes remain (8 generated - 2 used)');

    // ──────────────────────────────────────────────────────────────────
    // GROUP F: REGENERATE BACKUP CODES
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP F: Regenerate Backup Codes ---');

    // F.1: Wrong password rejected
    const tF1 = await request('/auth/2fa/backup-codes/regenerate', {
      method: 'POST',
      token: authenticated2FAToken,
      body: { password: 'WrongPassword!', code: totpGenerator.generate() },
    });
    assert(tF1.status === 401, 'F.1 Wrong password rejects regeneration with 401');

    // F.2: Wrong TOTP rejected
    const tF2 = await request('/auth/2fa/backup-codes/regenerate', {
      method: 'POST',
      token: authenticated2FAToken,
      body: { password: testPassword, code: '000000' },
    });
    assert(tF2.status === 401, 'F.2 Wrong TOTP rejects regeneration with 401');

    // F.3: Valid password + TOTP regenerates codes
    const tF3 = await request('/auth/2fa/backup-codes/regenerate', {
      method: 'POST',
      token: authenticated2FAToken,
      body: { password: testPassword, code: totpGenerator.generate() },
    });
    assert(tF3.status === 200, 'F.3 Regeneration succeeds with 200 OK');
    assert(Array.isArray(tF3.data?.backupCodes) && tF3.data?.backupCodes.length === 8, 'F.3 Generates exactly 8 new codes');

    const newBackupCodes: string[] = tF3.data.backupCodes;

    // F.4: Old codes no longer work
    const loginForOldCode = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    const oldCodeAttempt = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: loginForOldCode.data.tempToken, code: generatedBackupCodes[2] },
    });
    assert(oldCodeAttempt.status === 401, 'F.4 Old backup codes no longer work after regeneration');

    // F.5: New code works
    const newCodeAttempt = await request('/auth/2fa/verify-login', {
      method: 'POST',
      body: { tempToken: loginForOldCode.data.tempToken, code: newBackupCodes[0] },
    });
    assert(newCodeAttempt.status === 200, 'F.5 Newly generated backup code works');

    // ──────────────────────────────────────────────────────────────────
    // GROUP G: DISABLE 2FA
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP G: Disable 2FA ---');

    // G.1: Password alone cannot disable
    const tG1 = await request('/auth/2fa/disable', {
      method: 'POST',
      token: authenticated2FAToken,
      body: { password: testPassword, code: '' },
    });
    assert(tG1.status === 400 || tG1.status === 401, 'G.1 Disabling without code rejected');

    // G.2: Valid password + TOTP disables 2FA
    const tG2 = await request('/auth/2fa/disable', {
      method: 'POST',
      token: authenticated2FAToken,
      body: { password: testPassword, code: totpGenerator.generate() },
    });
    assert(tG2.status === 200, 'G.2 Valid password + TOTP disables 2FA with 200 OK');

    const userAfterDisable = store.users.get(userStandard.id);
    assert(userAfterDisable.twoFactorEnabled === false, 'G.2 User twoFactorEnabled is now false');
    assert(userAfterDisable.twoFactorSecret === null, 'G.2 twoFactorSecret is cleared from database');

    const remainingDbCodes = Array.from(store.backupCodes.values()).filter((bc) => bc.userId === userStandard.id);
    assert(remainingDbCodes.length === 0, 'G.2 All backup codes purged from database');

    // G.3: User can now log in normally in 1 step
    const tG3 = await request('/auth/login', {
      method: 'POST',
      body: { email: userStandard.email, password: testPassword },
    });
    assert(tG3.status === 200, 'G.3 Login returns 200 OK directly');
    assert(tG3.data?.requires2FA === false, 'G.3 Login does NOT require 2FA');
    assert(typeof tG3.data?.token === 'string', 'G.3 Direct ACCESS token issued');

    // ──────────────────────────────────────────────────────────────────
    // GROUP H: LOGOUT & AUDIT LOG VERIFICATION
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- GROUP H: Logout & Audit Log Verification ---');

    // H.1: Logout endpoint records audit log
    const tH1 = await request('/auth/logout', {
      method: 'POST',
      token: authenticated2FAToken,
    });
    assert(tH1.status === 200, 'H.1 /auth/logout returns 200 OK');

    // H.2: Audit log events catalog
    const auditLogs = Array.from(store.auditLogs.values());
    const actionTypes = auditLogs.map((a) => a.actionType);

    assert(actionTypes.includes('AUTH_LOGIN_SUCCESS'), 'H.2 Audit records AUTH_LOGIN_SUCCESS');
    assert(actionTypes.includes('AUTH_LOGIN_FAILED'), 'H.2 Audit records AUTH_LOGIN_FAILED');
    assert(actionTypes.includes('2FA_CHALLENGE_ISSUED'), 'H.2 Audit records 2FA_CHALLENGE_ISSUED');
    assert(actionTypes.includes('2FA_SUCCESS'), 'H.2 Audit records 2FA_SUCCESS');
    assert(actionTypes.includes('2FA_FAILED'), 'H.2 Audit records 2FA_FAILED');
    assert(actionTypes.includes('2FA_SETUP'), 'H.2 Audit records 2FA_SETUP');
    assert(actionTypes.includes('2FA_ENABLED'), 'H.2 Audit records 2FA_ENABLED');
    assert(actionTypes.includes('2FA_DISABLED'), 'H.2 Audit records 2FA_DISABLED');
    assert(actionTypes.includes('BACKUP_CODES_REGENERATED'), 'H.2 Audit records BACKUP_CODES_REGENERATED');
    assert(actionTypes.includes('AUTH_LOGOUT'), 'H.2 Audit records AUTH_LOGOUT');

    // H.3: Unknown email failed login has null actorId
    const unknownFailedAudit = auditLogs.find((a) => a.actionType === 'AUTH_LOGIN_FAILED' && a.entityId === 'unknown');
    assert(!!unknownFailedAudit && unknownFailedAudit.actorId === null, 'H.3 Failed login for unknown email has actorId: null');

    // H.4: Known user wrong password has user's actorId
    const knownFailedAudit = auditLogs.find((a) => a.actionType === 'AUTH_LOGIN_FAILED' && a.actorId === userStandard.id);
    assert(!!knownFailedAudit, 'H.4 Failed login for known user records valid actorId');

    // H.5: Zero secrets in audit logs
    const allDetailsString = auditLogs.map((a) => a.details || '').join(' ');
    assert(!allDetailsString.includes(testPassword), 'H.5 Password NEVER appears in audit details');
    assert(!allDetailsString.includes(currentManualKey), 'H.5 TOTP secret NEVER appears in audit details');
    assert(!allDetailsString.includes('Bearer '), 'H.5 Bearer tokens NEVER appear in audit details');
    assert(generatedBackupCodes.every((bc) => !allDetailsString.includes(bc)), 'H.5 Backup codes NEVER appear in audit details');

    console.log('\n======================================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runBatch3DAuthTests().catch((err) => {
  console.error('UNEXPECTED TEST EXCEPTION:', err);
  process.exit(1);
});
