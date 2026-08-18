import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { AssignTeamInput } from '../schemas/team-assignment.schema';

// Prisma include for returning updated Application with team
const applicationWithTeamInclude = {
  candidate:    { select: { id: true, name: true, email: true } },
  position:     { select: { id: true, title: true, department: true } },
  currentStage: { select: { id: true, name: true, sequenceOrder: true } },
  assignedTeam: { select: { id: true, name: true } }
} as const;

export class TeamAssignmentService {
  /**
   * Assign a Team to an Application.
   * HR only. Reassignment to a different Team is allowed.
   * Null unassignment is NOT supported in Sprint 1.
   *
   * The Application update and APPLICATION_TEAM_ASSIGNED AuditLog are written
   * inside a single prisma.$transaction. Either both succeed or both roll back.
   */
  static async assignTeam(actorId: string, applicationId: string, input: AssignTeamInput) {
    // Read-only validation outside transaction
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    const team = await prisma.team.findUnique({
      where: { id: input.teamId }
    });

    if (!team) {
      throw new AppError(404, 'Team not found.');
    }

    const oldTeamId = application.assignedTeamId;

    // Atomically update assignedTeamId + write audit log
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data:  { assignedTeamId: input.teamId },
        include: applicationWithTeamInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'APPLICATION_TEAM_ASSIGNED',
          entityType: 'Application',
          entityId:   applicationId,
          details:    JSON.stringify({ oldTeamId, newTeamId: input.teamId })
        }
      });

      return updated;
    });

    return updatedApplication;
  }
}
