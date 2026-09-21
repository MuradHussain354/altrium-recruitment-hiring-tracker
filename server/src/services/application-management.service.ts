import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { ApplicationStatus } from '@prisma/client';
import { ListApplicationsInput, ChangeStageInput, ChangeStatusInput } from '../schemas/application-management.schema';

// Prisma include shapes reused across methods
const listInclude = {
  candidate: {
    select: { id: true, name: true, email: true, phone: true, source: true }
  },
  position: {
    select: { id: true, title: true, department: true, status: true }
  },
  currentStage: {
    select: { id: true, name: true, sequenceOrder: true }
  },
  assignedTeam: {
    select: { id: true, name: true }
  }
} as const;

const detailInclude = {
  candidate: {
    select: { id: true, name: true, email: true, phone: true, resumeUrl: true, source: true }
  },
  position: {
    select: { id: true, title: true, department: true, description: true, status: true }
  },
  currentStage: {
    select: { id: true, name: true, sequenceOrder: true, isGating: true, feedbackRequiredCount: true }
  },
  assignedTeam: {
    select: { id: true, name: true }
  }
} as const;

export class ApplicationManagementService {
  /**
   * List applications with optional filters.
   * Accessible by HR and Manager (read-only for Manager).
   */
  static async listApplications(filters: ListApplicationsInput) {
    const where: Record<string, unknown> = {};

    if (filters.positionId) {
      where.positionId = filters.positionId;
    }

    if (filters.stageId) {
      where.currentStageId = filters.stageId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.candidate = {
        OR: [
          { name:  { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } }
        ]
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' }
    });

    return applications;
  }

  /**
   * Retrieve full application detail by ID.
   * Accessible by HR and Manager.
   */
  static async getApplicationById(applicationId: string) {
    const application = await prisma.application.findUnique({
      where:   { id: applicationId },
      include: detailInclude
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    return application;
  }

  /**
   * Move application to another stage within the same Position.
   * The stage update and audit log are written inside a single prisma.$transaction.
   * If either operation fails, both roll back atomically.
   *
   * Note: forward-only progression is NOT enforced in Sprint 1.
   * HR may move to any valid Stage belonging to the same Position.
   */
  static async moveApplicationStage(actorId: string, applicationId: string, input: ChangeStageInput) {
    // Fetch Application outside transaction (read-only validation)
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    // Fetch target Stage
    const targetStage = await prisma.stage.findUnique({
      where: { id: input.stageId }
    });

    if (!targetStage) {
      throw new AppError(404, 'Stage not found.');
    }

    // Validate stage belongs to the same Position as the Application
    if (targetStage.positionId !== application.positionId) {
      throw new AppError(400, 'Target stage does not belong to the same position as this application.');
    }

    // No-op guard: already at this stage
    if (application.currentStageId === input.stageId) {
      throw new AppError(400, 'Application is already at the specified stage.');
    }

    // Gate Enforcement: evaluate current stage gating rules
    const currentStage = await prisma.stage.findUnique({
      where: { id: application.currentStageId }
    });

    if (!currentStage) {
      throw new AppError(404, 'Current stage not found.');
    }

    if (currentStage.isGating && currentStage.feedbackRequiredCount > 0) {
      // Query qualifying feedback for this Application at the current Stage
      const qualifyingFeedbacks = await prisma.feedback.findMany({
        where: {
          interview: {
            applicationId: application.id,
            stageId:       application.currentStageId
          }
        },
        include: {
          interview: {
            include: {
              assignments: true
            }
          }
        }
      });

      // A Feedback qualifies iff corresponding InterviewerAssignment has feedbackSubmitted === true
      const qualifyingFeedbackCount = qualifyingFeedbacks.filter((fb) =>
        fb.interview.assignments.some(
          (a) => a.interviewerId === fb.interviewerId && a.feedbackSubmitted === true
        )
      ).length;

      if (qualifyingFeedbackCount < currentStage.feedbackRequiredCount) {
        throw new AppError(
          409,
          `Stage movement blocked: Current stage '${currentStage.name}' requires ${currentStage.feedbackRequiredCount} submitted feedback(s), but only ${qualifyingFeedbackCount} qualifying feedback(s) have been submitted.`
        );
      }
    }

    const oldStageId = application.currentStageId;

    // Atomically update currentStageId + write audit log in a single transaction
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data:  { currentStageId: input.stageId, stageEnteredAt: new Date() },
        include: detailInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'APPLICATION_STAGE_CHANGED',
          entityType: 'Application',
          entityId:   applicationId,
          details:    JSON.stringify({ oldStageId, newStageId: input.stageId })
        }
      });

      return updated;
    });

    return updatedApplication;
  }

  /**
   * Update the overall status of an Application.
   * currentStageId is NOT modified by this operation (stage/status independence).
   * The status update and audit log are written inside a single prisma.$transaction.
   * statusReason is NOT stored in audit details — only on the Application record.
   */
  static async updateApplicationStatus(actorId: string, applicationId: string, input: ChangeStatusInput) {
    // Fetch Application outside transaction (read-only validation)
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new AppError(404, 'Application not found.');
    }

    const oldStatus = application.status;

    // Atomically update status + write audit log in a single transaction
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status:       input.status,
          statusReason: input.statusReason ?? null
        },
        include: detailInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'APPLICATION_STATUS_CHANGED',
          entityType: 'Application',
          entityId:   applicationId,
          // statusReason intentionally excluded from audit details
          details:    JSON.stringify({ oldStatus, newStatus: input.status })
        }
      });

      return updated;
    });

    return updatedApplication;
  }

  /**
   * Bulk status change for multiple applications.
   * Each application is validated independently. Results returned per application.
   */
  static async bulkChangeStatus(
    actorId: string,
    applicationIds: string[],
    status: ApplicationStatus,
    statusReason?: string
  ) {
    const results: { applicationId: string; success: boolean; reason?: string }[] = [];

    for (const applicationId of applicationIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const application = await tx.application.findUnique({ where: { id: applicationId } });
          if (!application) throw new Error('Application not found.');

          const oldStatus = application.status;

          await tx.application.update({
            where: { id: applicationId },
            data: { status, statusReason: statusReason ?? null }
          });

          await tx.auditLog.create({
            data: {
              actorId,
              actionType: 'APPLICATION_STATUS_CHANGED',
              entityType: 'Application',
              entityId: applicationId,
              details: JSON.stringify({ oldStatus, newStatus: status, bulk: true })
            }
          });
        });

        results.push({ applicationId, success: true });
      } catch (err: any) {
        results.push({ applicationId, success: false, reason: err.message ?? 'Unknown error' });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return { total: applicationIds.length, succeeded, failed: applicationIds.length - succeeded, results };
  }

  /**
   * Bulk stage change with per-application gating validation.
   * Successful applications are updated; ineligible ones remain unchanged.
   * Per-application result is returned.
   */
  static async bulkChangeStage(
    actorId: string,
    applicationIds: string[],
    targetStageId: string
  ) {
    const results: { applicationId: string; success: boolean; reason?: string }[] = [];

    // Pre-fetch target stage once
    const targetStage = await prisma.stage.findUnique({ where: { id: targetStageId } });
    if (!targetStage) throw new AppError(404, 'Target stage not found.');

    for (const applicationId of applicationIds) {
      try {
        // All validation + update in a single atomic transaction per application
        await prisma.$transaction(async (tx) => {
          const application = await tx.application.findUnique({ where: { id: applicationId } });
          if (!application) throw new Error('Application not found.');

          if (targetStage.positionId !== application.positionId) {
            throw new Error('Target stage does not belong to the application\'s position.');
          }

          if (application.currentStageId === targetStageId) {
            throw new Error('Application is already at the specified stage.');
          }

          const currentStage = await tx.stage.findUnique({ where: { id: application.currentStageId } });
          if (!currentStage) throw new Error('Current stage not found.');

          // Gating enforcement
          if (currentStage.isGating && currentStage.feedbackRequiredCount > 0) {
            const qualifyingFeedbacks = await tx.feedback.findMany({
              where: {
                interview: {
                  applicationId: application.id,
                  stageId: application.currentStageId
                }
              },
              include: {
                interview: { include: { assignments: true } }
              }
            });

            const qualifyingCount = qualifyingFeedbacks.filter((fb) =>
              fb.interview.assignments.some(
                (a) => a.interviewerId === fb.interviewerId && a.feedbackSubmitted === true
              )
            ).length;

            if (qualifyingCount < currentStage.feedbackRequiredCount) {
              throw new Error(
                `Gating rule: stage '${currentStage.name}' requires ${currentStage.feedbackRequiredCount} feedback(s), received ${qualifyingCount}.`
              );
            }
          }

          const oldStageId = application.currentStageId;

          await tx.application.update({
            where: { id: applicationId },
            data: { currentStageId: targetStageId, stageEnteredAt: new Date() }
          });

          await tx.auditLog.create({
            data: {
              actorId,
              actionType: 'APPLICATION_STAGE_CHANGED',
              entityType: 'Application',
              entityId: applicationId,
              details: JSON.stringify({ oldStageId, newStageId: targetStageId, bulk: true })
            }
          });
        });

        results.push({ applicationId, success: true });
      } catch (err: any) {
        results.push({ applicationId, success: false, reason: err.message ?? 'Unknown error' });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return { total: applicationIds.length, succeeded, failed: applicationIds.length - succeeded, results };
  }

  /**
   * Bulk team assignment for multiple applications.
   * teamId can be null to unassign.
   */
  static async bulkAssignTeam(
    actorId: string,
    applicationIds: string[],
    teamId: string | null
  ) {
    const results: { applicationId: string; success: boolean; reason?: string }[] = [];

    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) throw new AppError(404, 'Team not found.');
    }

    for (const applicationId of applicationIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const application = await tx.application.findUnique({ where: { id: applicationId } });
          if (!application) throw new Error('Application not found.');

          const oldTeamId = application.assignedTeamId;

          await tx.application.update({
            where: { id: applicationId },
            data: { assignedTeamId: teamId }
          });

          await tx.auditLog.create({
            data: {
              actorId,
              actionType: 'APPLICATION_TEAM_ASSIGNED',
              entityType: 'Application',
              entityId: applicationId,
              details: JSON.stringify({ oldTeamId, newTeamId: teamId, bulk: true })
            }
          });
        });

        results.push({ applicationId, success: true });
      } catch (err: any) {
        results.push({ applicationId, success: false, reason: err.message ?? 'Unknown error' });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    return { total: applicationIds.length, succeeded, failed: applicationIds.length - succeeded, results };
  }

  /**
   * HR requests Manager offer approval for an application.
   * Does NOT modify application status.
   */
  static async requestOfferApproval(
    actorId: string,
    applicationId: string,
    data: { salaryOffered?: number; startDate?: Date; notes?: string }
  ) {
    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new AppError(404, 'Application not found.');

    if (application.offerApprovalStatus === 'Pending') {
      throw new AppError(409, 'An offer approval is already pending for this application.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.application.update({
        where: { id: applicationId },
        data: {
          offerApprovalStatus: 'Pending',
          offerSalaryOffered: data.salaryOffered ? data.salaryOffered : null,
          offerStartDate: data.startDate ?? null,
          offerNotes: data.notes ?? null,
          offerRequestedById: actorId
        }
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'OFFER_APPROVAL_REQUESTED',
          entityType: 'Application',
          entityId: applicationId,
          details: JSON.stringify({ requestedById: actorId })
        }
      });

      return result;
    });

    return updated;
  }

  /**
   * Manager approves or rejects an offer.
   * IMPORTANT: Does NOT automatically set application status to Hired.
   * Strictly Manager-only endpoint.
   */
  static async decideOfferApproval(
    actor: { id: string; role: string },
    applicationId: string,
    data: { decision: 'Approved' | 'Rejected'; notes?: string }
  ) {
    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) throw new AppError(404, 'Application not found.');

    if (application.offerApprovalStatus !== 'Pending') {
      throw new AppError(409, 'No pending offer approval for this application.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.application.update({
        where: { id: applicationId },
        data: {
          offerApprovalStatus: data.decision as any,
          offerApprovedById: actor.id,
          offerDecidedAt: new Date(),
          offerNotes: data.notes ?? application.offerNotes
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: `OFFER_${data.decision.toUpperCase()}`,
          entityType: 'Application',
          entityId: applicationId,
          details: JSON.stringify({ decision: data.decision, decidedBy: actor.id })
        }
      });

      return result;
    });

    return updated;
  }
}
