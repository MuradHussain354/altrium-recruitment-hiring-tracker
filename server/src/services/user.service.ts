import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateManagedUserInput, UpdateUserStatusInput } from '../schemas/user.schema';
import { SafeUserProfile } from './auth.service';

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
    return prisma.user.findMany({
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
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  static async createManagedUser(
    managerId: string,
    input: CreateManagedUserInput
  ): Promise<SafeUserProfile> {
    const { name, email, password, role, teamId } = input;

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

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create user with transaction including AuditLog
    const [newUser] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role,
          teamId: teamId || null,
          createdById: managerId,
          isActive: true
        }
      })
    ]);

    // Create audit log event
    await prisma.auditLog.create({
      data: {
        actorId: managerId,
        actionType: 'USER_CREATED',
        entityType: 'User',
        entityId: newUser.id,
        details: `Created ${newUser.role} account for ${newUser.email}`
      }
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
