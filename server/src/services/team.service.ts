import prisma from '../config/prisma';

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
}
