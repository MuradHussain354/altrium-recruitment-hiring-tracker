import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/errors';
import { LoginInput } from '../schemas/auth.schema';
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
}

export interface LoginResult {
  token: string;
  user: SafeUserProfile;
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
   * Explicitly excludes passwordHash.
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
    };
  }

  /**
   * Authenticates user email/password with enumeration protection and timing equalization.
   * Returns a standard JWT immediately on valid credentials.
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

    // 5. Direct password login
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
      token,
      user: safeUser,
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
