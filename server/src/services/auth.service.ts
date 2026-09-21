import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { signToken, signTwoFactorTempToken, verify2FATempToken } from '../utils/jwt';
import { encrypt, decrypt } from '../utils/crypto';
import { generateTotpSecret, generateQrCodeDataUrl, verifyTotpToken } from '../utils/totp';
import { generateBackupCodes, verifyBackupCode } from '../utils/backup-codes';
import { AppError } from '../utils/errors';
import {
  LoginInput,
  Enable2FAInput,
  Disable2FAInput,
  RegenerateBackupCodesInput,
  Verify2FALoginInput,
} from '../schemas/auth.schema';
import { AuditLogService } from './audit-log.service';
import { Role } from '@prisma/client';

export interface SafeUserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamId: string | null;
  createdById: string | null;
  createdAt: Date;
  twoFactorEnabled?: boolean;
}

export interface LoginResult {
  requires2FA: boolean;
  token: string;
  user: SafeUserProfile;
  tempToken?: string;
}

export interface TwoFactorSetupResponse {
  qrCodeUrl: string;
  otpauthUri: string;
  manualKey: string;
}

export interface TwoFactorEnableResponse {
  success: true;
  message: string;
  backupCodes: string[];
  warning: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  remainingBackupCodes: number;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

// Pre-computed valid bcrypt hash used to equalize execution time for unknown users
const STATIC_DUMMY_BCRYPT_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export class AuthService {
  /**
   * Constructs a safe, leak-free user profile.
   * Explicitly excludes passwordHash, twoFactorSecret, and twoFactorTempSecret.
   */
  public static toSafeUser(user: any): SafeUserProfile {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      teamId: user.teamId,
      createdById: user.createdById,
      createdAt: user.createdAt,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
    };
  }

  /**
   * Authenticates user email/password with enumeration protection and timing equalization.
   * If 2FA is disabled: returns standard JWT.
   * If 2FA is enabled: returns 5-minute restricted challenge token.
   */
  static async login(input: LoginInput, meta?: RequestMeta): Promise<LoginResult> {
    const { email, password } = input;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 2. Unknown email handling: execute dummy bcrypt compare to equalize latency
    if (!user) {
      await bcrypt.compare(password, STATIC_DUMMY_BCRYPT_HASH);
      await AuditLogService.logAuthEvent({
        actorId: null,
        actionType: 'AUTH_LOGIN_FAILED',
        entityId: 'unknown',
        details: { reason: 'Invalid credentials' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new AppError(401, 'Invalid email or password.');
    }

    // 3. Reject deactivated accounts
    if (!user.isActive) {
      await AuditLogService.logAuthEvent({
        actorId: user.id,
        actionType: 'AUTH_LOGIN_FAILED',
        entityId: user.id,
        details: { reason: 'Account is deactivated' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new AppError(403, 'Account is deactivated. Please contact your Manager.');
    }

    // 4. Verify password against stored hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await AuditLogService.logAuthEvent({
        actorId: user.id,
        actionType: 'AUTH_LOGIN_FAILED',
        entityId: user.id,
        details: { reason: 'Invalid credentials' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      throw new AppError(401, 'Invalid email or password.');
    }

    const safeUser = this.toSafeUser(user);

    // 5. If 2FA is enabled, issue restricted temporary challenge token
    if (user.twoFactorEnabled) {
      const tempToken = signTwoFactorTempToken(user.id);
      await AuditLogService.logAuthEvent({
        actorId: user.id,
        actionType: '2FA_CHALLENGE_ISSUED',
        entityId: user.id,
        details: { message: 'Two-factor authentication challenge issued' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
      return {
        requires2FA: true,
        tempToken,
      } as unknown as LoginResult;
    }

    // 6. Direct password login for non-2FA users
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await AuditLogService.logAuthEvent({
      actorId: user.id,
      actionType: 'AUTH_LOGIN_SUCCESS',
      entityId: user.id,
      details: { method: 'password' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      requires2FA: false,
      token,
      user: safeUser,
    };
  }

  /**
   * Completes Step 2 of login: verifies TOTP code or single-use backup code.
   */
  static async verify2FALogin(
    input: Verify2FALoginInput,
    meta?: RequestMeta
  ): Promise<{ token: string; user: SafeUserProfile; usedBackupCode?: boolean }> {
    const { tempToken, code } = input;

    // 1. Verify temporary challenge token
    const { sub: userId } = verify2FATempToken(tempToken);

    // 2. Lookup user and verify state
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, 'Two-factor authentication is not enabled for this user.');
    }

    const safeUser = this.toSafeUser(user);

    // 3. Attempt TOTP verification
    try {
      const decryptedSecret = decrypt(user.twoFactorSecret);
      if (verifyTotpToken(code, decryptedSecret)) {
        const token = signToken({
          id: user.id,
          email: user.email,
          role: user.role,
        });

        await AuditLogService.logAuthEvent({
          actorId: user.id,
          actionType: '2FA_SUCCESS',
          entityId: user.id,
          details: { method: 'totp' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return { token, user: safeUser };
      }
    } catch (_err) {
      // Fall through to test backup codes
    }

    // 4. Attempt Backup Code verification with atomic conditional update
    const unusedBackupCodes = await prisma.twoFactorBackupCode.findMany({
      where: { userId: user.id, usedAt: null },
    });

    let matchedCodeId: string | null = null;
    for (const bc of unusedBackupCodes) {
      const matches = await verifyBackupCode(code, bc.codeHash);
      if (matches) {
        matchedCodeId = bc.id;
        break;
      }
    }

    if (matchedCodeId) {
      // Atomic Compare-And-Swap (CAS) update: only succeeds if still unused
      const updateResult = await prisma.twoFactorBackupCode.updateMany({
        where: {
          id: matchedCodeId,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (updateResult.count === 1) {
        const token = signToken({
          id: user.id,
          email: user.email,
          role: user.role,
        });

        await AuditLogService.logAuthEvent({
          actorId: user.id,
          actionType: '2FA_SUCCESS',
          entityId: user.id,
          details: { method: 'backup_code' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        });

        return { token, user: safeUser, usedBackupCode: true };
      }

      // If updateResult.count === 0, a concurrent request already consumed this code
      await AuditLogService.logAuthEvent({
        actorId: user.id,
        actionType: '2FA_FAILED',
        entityId: user.id,
        details: { method: 'backup_code', reason: 'concurrent_consumption' },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      throw new AppError(401, 'Invalid authentication code.');
    }

    // 5. Neither TOTP nor backup code matched
    await AuditLogService.logAuthEvent({
      actorId: user.id,
      actionType: '2FA_FAILED',
      entityId: user.id,
      details: { reason: 'Invalid code provided' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    throw new AppError(401, 'Invalid authentication code.');
  }

  /**
   * Initiates 2FA setup: generates secret, encrypts with AES-256-GCM, stores in temp column with 10m TTL.
   */
  static async setup2FA(userId: string, meta?: RequestMeta): Promise<TwoFactorSetupResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    // Generate secret and enrollment details
    const enrollment = generateTotpSecret(user.email);
    const encryptedSecret = encrypt(enrollment.secret);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store encrypted temporary secret and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempSecret: encryptedSecret,
        twoFactorTempExpiresAt: expiresAt,
      },
    });

    const qrCodeUrl = await generateQrCodeDataUrl(enrollment.uri);

    await AuditLogService.logAuthEvent({
      actorId: user.id,
      actionType: '2FA_SETUP',
      entityId: user.id,
      details: { message: 'Initiated two-factor authentication setup' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      qrCodeUrl,
      otpauthUri: enrollment.uri,
      manualKey: enrollment.secret,
    };
  }

  /**
   * Confirms 2FA setup: verifies first TOTP, promotes secret, enables 2FA, generates 8 backup codes.
   */
  static async enable2FA(
    userId: string,
    input: Enable2FAInput,
    meta?: RequestMeta
  ): Promise<TwoFactorEnableResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    if (!user.twoFactorTempSecret || !user.twoFactorTempExpiresAt) {
      throw new AppError(400, 'No pending 2FA setup found. Please initiate setup first.');
    }

    // Check expiration
    if (new Date() > user.twoFactorTempExpiresAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorTempSecret: null,
          twoFactorTempExpiresAt: null,
        },
      });
      throw new AppError(400, '2FA setup session has expired. Please initiate setup again.');
    }

    // Decrypt and verify submitted TOTP code
    const secret = decrypt(user.twoFactorTempSecret);
    const isValid = verifyTotpToken(input.code, secret);
    if (!isValid) {
      throw new AppError(401, 'Invalid two-factor authentication code.');
    }

    // Generate 8 single-use backup codes
    const { plaintextCodes, hashedCodes } = await generateBackupCodes(8);

    // Atomically promote temporary secret, enable 2FA, and store hashed backup codes
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFactorSecret: user.twoFactorTempSecret,
          twoFactorEnabled: true,
          twoFactorTempSecret: null,
          twoFactorTempExpiresAt: null,
        },
      });

      await tx.twoFactorBackupCode.deleteMany({
        where: { userId: user.id },
      });

      await tx.twoFactorBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          userId: user.id,
          codeHash,
        })),
      });

      await AuditLogService.logAuthEvent(
        {
          actorId: user.id,
          actionType: '2FA_ENABLED',
          entityId: user.id,
          details: { message: 'Two-factor authentication enabled successfully' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx
      );
    });

    return {
      success: true,
      message: 'Two-factor authentication enabled successfully.',
      backupCodes: plaintextCodes,
      warning: 'These backup codes will only be shown once. Please save them in a secure place.',
    };
  }

  /**
   * Disables 2FA: requires valid password + (valid TOTP OR valid unused backup code).
   */
  static async disable2FA(
    userId: string,
    input: Disable2FAInput,
    meta?: RequestMeta
  ): Promise<{ success: true; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, 'Two-factor authentication is not currently enabled.');
    }

    // 1. Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid password.');
    }

    // 2. Verify TOTP or backup code
    let isCodeValid = false;
    try {
      const secret = decrypt(user.twoFactorSecret);
      isCodeValid = verifyTotpToken(input.code, secret);
    } catch (_err) {
      isCodeValid = false;
    }

    if (!isCodeValid) {
      const unusedCodes = await prisma.twoFactorBackupCode.findMany({
        where: { userId: user.id, usedAt: null },
      });
      for (const bc of unusedCodes) {
        if (await verifyBackupCode(input.code, bc.codeHash)) {
          isCodeValid = true;
          break;
        }
      }
    }

    if (!isCodeValid) {
      throw new AppError(401, 'Invalid authentication code. Please enter a valid TOTP code or backup code.');
    }

    // 3. Atomically disable 2FA, clear secrets, and delete backup codes
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorTempSecret: null,
          twoFactorTempExpiresAt: null,
        },
      });

      await tx.twoFactorBackupCode.deleteMany({
        where: { userId: user.id },
      });

      await AuditLogService.logAuthEvent(
        {
          actorId: user.id,
          actionType: '2FA_DISABLED',
          entityId: user.id,
          details: { message: 'Two-factor authentication disabled' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx
      );
    });

    return {
      success: true,
      message: 'Two-factor authentication disabled successfully.',
    };
  }

  /**
   * Regenerates backup codes: requires password + valid current TOTP.
   */
  static async regenerateBackupCodes(
    userId: string,
    input: RegenerateBackupCodesInput,
    meta?: RequestMeta
  ): Promise<{ success: true; backupCodes: string[]; warning: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, 'Two-factor authentication is not enabled.');
    }

    // 1. Verify password
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid password.');
    }

    // 2. Verify current TOTP
    const secret = decrypt(user.twoFactorSecret);
    const isTotpValid = verifyTotpToken(input.code, secret);
    if (!isTotpValid) {
      throw new AppError(401, 'Invalid two-factor authentication code.');
    }

    // 3. Generate 8 new backup codes
    const { plaintextCodes, hashedCodes } = await generateBackupCodes(8);

    // 4. Atomically purge old backup codes and insert new ones
    await prisma.$transaction(async (tx) => {
      await tx.twoFactorBackupCode.deleteMany({
        where: { userId: user.id },
      });

      await tx.twoFactorBackupCode.createMany({
        data: hashedCodes.map((codeHash) => ({
          userId: user.id,
          codeHash,
        })),
      });

      await AuditLogService.logAuthEvent(
        {
          actorId: user.id,
          actionType: 'BACKUP_CODES_REGENERATED',
          entityId: user.id,
          details: { message: 'Backup codes regenerated' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx
      );
    });

    return {
      success: true,
      backupCodes: plaintextCodes,
      warning: 'These backup codes will only be shown once. Please save them in a secure place.',
    };
  }

  /**
   * Returns current user's 2FA status and unused backup codes count.
   */
  static async get2FAStatus(userId: string): Promise<TwoFactorStatusResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    const remainingCodes = await prisma.twoFactorBackupCode.count({
      where: { userId: user.id, usedAt: null },
    });

    return {
      enabled: user.twoFactorEnabled,
      remainingBackupCodes: remainingCodes,
    };
  }

  /**
   * Logs out user: records AUTH_LOGOUT audit event. Client removes token from storage.
   */
  static async logout(userId: string, meta?: RequestMeta): Promise<{ success: true; message: string }> {
    await AuditLogService.logAuthEvent({
      actorId: userId,
      actionType: 'AUTH_LOGOUT',
      entityId: userId,
      details: { message: 'User logged out' },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }

  /**
   * Retrieves current authenticated user profile.
   */
  static async getMe(userId: string): Promise<SafeUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new AppError(401, 'User account is invalid or deactivated.');
    }

    return this.toSafeUser(user);
  }
}
