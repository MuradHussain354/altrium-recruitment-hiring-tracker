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

    const oldStageId = application.currentStageId;

    // Atomically update currentStageId + write audit log in a single transaction
    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data:  { currentStageId: input.stageId },
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
}
