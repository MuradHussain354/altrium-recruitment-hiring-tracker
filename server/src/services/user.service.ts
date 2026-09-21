import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateManagedUserInput, UpdateUserStatusInput } from '../schemas/user.schema';
import { AuthService, SafeUserProfile, RequestMeta } from './auth.service';
import { EmailService } from './email.service';
import { encryptEmailToken } from '../utils/email-crypto';
import { AuditLogService } from './audit-log.service';
import { signToken } from '../utils/jwt';
import { computeInvitationExpiry } from '../constants/invitation.constants';

// Generic response for any invalid/expired/already-used invitation token.
// Deliberately identical across "not found", "expired", and "already accepted"
// so the endpoint cannot be used to enumerate invitation state.
const INVALID_INVITATION_MESSAGE = 'This invitation link is invalid or has expired.';

export interface InvitationDetails {
  name: string;
  email: string;
  role: Role;
}

export interface AcceptInvitationResult {
  token: string;
  user: SafeUserProfile;
}

export interface EligibleInterviewerProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamId: string | null;
}

export class UserService {
  /**
   * List active HR and TeamLead users eligible for interview assignment.
   * Excludes Managers, inactive users, and sensitive fields (passwordHash).
   * Ordered alphabetically by name ASC.
   * Read-only: zero audit logs created.
   */
  static async listEligibleInterviewers(): Promise<EligibleInterviewerProfile[]> {
    return prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [Role.HR, Role.TeamLead]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        teamId: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * List all managed staff accounts (HR & TeamLead) for Manager staff directory.
   * Includes both active and inactive accounts.
   * Excludes Managers, passwordHash, and internal tokens.
   * Ordered alphabetically by name ASC.
   * Read-only: zero audit logs created.
   */
  static async listManagedUsers() {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.HR, Role.TeamLead]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        teamId: true,
        createdAt: true,
        invitationTokenHash: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Expose only a boolean "invitation still pending" flag — never the hash itself —
    // so the Staff Directory can distinguish "Invited (Pending)" from "Deactivated".
    return users.map(({ invitationTokenHash, ...u }) => ({
      ...u,
      invitationPending: !u.isActive && invitationTokenHash !== null
    }));
  }

  /**
   * Manager provisions a new HR/TeamLead account by invitation only (S2-45).
   * No password is collected from the Manager: the account is created inactive
   * with an unmatchable password hash, and the invited user chooses their own
   * password when they accept the invitation (see acceptInvitation below).
   */
  static async createManagedUser(
    managerId: string,
    input: CreateManagedUserInput
  ): Promise<SafeUserProfile> {
    const { name, email, role, teamId } = input;

    // 1. Verify email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError(400, 'User with this email already exists.');
    }

    // 2. Validate teamId if provided
    if (teamId) {
      const teamExists = await prisma.team.findUnique({
        where: { id: teamId }
      });
      if (!teamExists) {
        throw new AppError(400, 'Specified team does not exist.');
      }
    }

    // 3. Unmatchable placeholder password hash: the account is invitation-pending
    //    and has no usable password until acceptInvitation() sets a real one.
    //    bcrypt-hashing 32 cryptographically random bytes guarantees no submitted
    //    password can ever satisfy bcrypt.compare() against it.
    const unmatchablePassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(unmatchablePassword, 10);

    // 4. Generate a secure invitation token (S2-45)
    //    - rawToken: 32 random bytes as a URL-safe hex string (sent in email, never stored plaintext)
    //    - tokenHash: SHA-256 of rawToken (stored in DB for lookup/validation)
    //    - encryptedToken: AES-256-GCM envelope stored in outbox payload (decrypted at render time)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invitationExpiresAt = computeInvitationExpiry();

    // Encrypt BEFORE opening the transaction. If EMAIL_TOKEN_ENCRYPTION_KEY is
    // missing/malformed, encryptEmailToken() throws — that error propagates here
    // and the whole request fails with no user ever created. We never fall back
    // to plaintext and never silently create an unreachable pending account.
    const encryptedToken = encryptEmailToken(rawToken);

    // 5. Create user with invitation fields in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          teamId: teamId || null,
          createdById: managerId,
          isActive: false,
          invitationTokenHash:  tokenHash,
          invitationExpiresAt,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: managerId,
          actionType: 'USER_CREATED',
          entityType: 'User',
          entityId: created.id,
          details: `Created ${created.role} account for ${created.email} (invitation pending)`
        }
      });

      // S2-45: Enqueue invitation email within same transaction (durable outbox)
      await EmailService.sendAccountInvitation(tx, {
        recipient:      email.toLowerCase(),
        userId:         created.id,
        userName:       name,
        role:           role.toString(),
        encryptedToken,
        tokenHash,
      });

      return created;
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      isActive: newUser.isActive,
      teamId: newUser.teamId,
      createdById: newUser.createdById,
      createdAt: newUser.createdAt
    };
  }

  /**
   * Manager resends an invitation to a still-pending account (S2-45).
   * Generates a brand-new token/hash/expiry and overwrites the old
   * invitationTokenHash, which immediately invalidates any previously issued
   * invitation link (a lookup for the old raw token no longer matches any row).
   */
  static async resendInvitation(managerId: string, targetUserId: string): Promise<{ message: string }> {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser || !([Role.HR, Role.TeamLead] as Role[]).includes(targetUser.role)) {
      throw new AppError(404, 'Target user not found.');
    }

    if (targetUser.isActive || !targetUser.invitationTokenHash) {
      throw new AppError(400, 'This account is already active; there is no pending invitation to resend.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invitationExpiresAt = computeInvitationExpiry();

    // Fail safely and loudly if encryption is unavailable — never fall back to
    // plaintext and never leave the Manager believing a new invite went out.
    const encryptedToken = encryptEmailToken(rawToken);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          invitationTokenHash: tokenHash,
          invitationExpiresAt,
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: managerId,
          actionType: 'ACCOUNT_INVITATION_RESENT',
          entityType: 'User',
          entityId: targetUserId,
          details: `Invitation resent for ${targetUser.email}; previous invitation link invalidated`
        }
      });

      await EmailService.sendAccountInvitation(tx, {
        recipient:      targetUser.email,
        userId:         targetUserId,
        userName:       targetUser.name,
        role:           targetUser.role.toString(),
        encryptedToken,
        tokenHash,
      });
    });

    return { message: 'Invitation resent successfully.' };
  }

  /**
   * Public: returns sanitized invitation details for the acceptance page.
   * Never reveals whether a token is unknown vs. expired vs. already used —
   * all three cases return the same generic error.
   */
  static async getInvitationDetails(rawToken: string): Promise<InvitationDetails> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await prisma.user.findUnique({
      where: { invitationTokenHash: tokenHash }
    });

    if (!user || user.isActive || !user.invitationExpiresAt || user.invitationExpiresAt <= new Date()) {
      throw new AppError(400, INVALID_INVITATION_MESSAGE);
    }

    return { name: user.name, email: user.email, role: user.role };
  }

  /**
   * Public: atomically accepts an invitation, sets the user's chosen password,
   * activates the account, and clears the invitation token so it cannot be
   * reused. A standard JWT is issued only after the transaction commits.
   */
  static async acceptInvitation(
    rawToken: string,
    newPassword: string,
    meta?: RequestMeta
  ): Promise<AcceptInvitationResult> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const activatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { invitationTokenHash: tokenHash }
      });

      if (!user || user.isActive || !user.invitationExpiresAt || user.invitationExpiresAt <= new Date()) {
        throw new AppError(400, INVALID_INVITATION_MESSAGE);
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isActive: true,
          invitationTokenHash: null,
          invitationExpiresAt: null,
        }
      });

      await AuditLogService.createAuditLog(
        {
          actorId: user.id,
          actionType: 'ACCOUNT_INVITATION_ACCEPTED',
          entityType: 'User',
          entityId: user.id,
          details: { message: 'Invitation accepted; account activated' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        tx
      );

      return updated;
    });

    const safeUser = AuthService.toSafeUser(activatedUser);
    const token = signToken({
      id: activatedUser.id,
      email: activatedUser.email,
      role: activatedUser.role,
    });

    return { token, user: safeUser };
  }

  static async setUserStatus(
    managerId: string,
    targetUserId: string,
    input: UpdateUserStatusInput
  ): Promise<SafeUserProfile> {
    const { isActive } = input;

    // Prevent Manager from deactivating self
    if (managerId === targetUserId) {
      throw new AppError(400, 'Managers cannot deactivate their own account.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      throw new AppError(404, 'Target user not found.');
    }

    // Guard against stranding an invitation-pending account: it has no usable
    // password until acceptInvitation() sets one, and force-activating it here
    // would also make its still-pending invitationTokenHash permanently
    // unusable (acceptInvitation requires isActive === false). The Manager
    // should use resend-invitation instead.
    if (isActive && !targetUser.isActive && targetUser.invitationTokenHash) {
      throw new AppError(
        400,
        'This account has a pending invitation and has no password yet. Use "Resend Invitation" instead of activating it directly.'
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive }
    });

    // Create audit log event
    await prisma.auditLog.create({
      data: {
        actorId: managerId,
        actionType: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: targetUser.id,
        details: `Account ${isActive ? 'activated' : 'deactivated'} for ${targetUser.email}`
      }
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      teamId: updatedUser.teamId,
      createdById: updatedUser.createdById,
      createdAt: updatedUser.createdAt
    };
  }
}
