import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { CreateTeamInput } from '../schemas/team.schema';

export class TeamService {
  /**
   * List all Teams for HR/Manager lookup (e.g. Team Assignment dropdown).
   * Strictly selects only safe fields (id, name).
   * Ordered alphabetically by name ASC.
   * Read-only: zero audit logs created.
   */
  static async listTeams() {
    return prisma.team.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  /**
   * Create a new Team (Manager only).
   * Validates name uniqueness case-insensitively / trimmed.
   * Logs TEAM_CREATED audit log.
   */
  static async createTeam(managerId: string, input: CreateTeamInput) {
    const trimmedName = input.name.trim();

    // Verify creator exists
    const manager = await prisma.user.findUnique({
      where: { id: managerId }
    });

    if (!manager) {
      throw new AppError(404, 'Manager user not found.');
    }

    // Check for duplicate team name (case-insensitive)
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive'
        }
      }
    });

    if (existingTeam) {
      throw new AppError(409, `A team with the name "${trimmedName}" already exists.`);
    }

    // Create Team and AuditLog in a transaction
    const newTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: trimmedName,
          createdById: managerId
        },
        select: {
          id: true,
          name: true
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: managerId,
          actionType: 'TEAM_CREATED',
          entityType: 'Team',
          entityId: team.id,
          details: JSON.stringify({ name: team.name })
        }
      });

      return team;
    });

    return newTeam;
  }
}
