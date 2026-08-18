import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';
import {
  CreateInterviewInput,
  UpdateInterviewInput,
  UpdateInterviewStatusInput,
  UpdateInterviewersInput,
  ListInterviewsInput
} from '../schemas/interview.schema';

// ── Reusable Prisma include shapes ──────────────────────────────────────────

const interviewListInclude = {
  application: {
    select: {
      id:     true,
      status: true,
      candidate: { select: { id: true, name: true } },
      position:  { select: { id: true, title: true, department: true } }
    }
  },
  stage: {
    select: { id: true, name: true, sequenceOrder: true }
  },
  assignments: {
    select: {
      id:          true,
      assignedAt:  true,
      interviewer: { select: { id: true, name: true, role: true } }
    }
  }
} as const;

const interviewDetailInclude = {
  application: {
    select: {
      id:            true,
      status:        true,
      statusReason:  true,
      currentStageId: true,
      candidate: { select: { id: true, name: true, email: true, phone: true } },
      position:  { select: { id: true, title: true, department: true } }
    }
  },
  stage: {
    select: { id: true, name: true, sequenceOrder: true, isGating: true }
  },
  assignments: {
    select: {
      id:               true,
      feedbackSubmitted: true,
      assignedAt:       true,
      interviewer:      { select: { id: true, name: true, role: true } }
    }
  }
} as const;

// ── Valid interviewer roles (approved: HR and TeamLead only) ─────────────────
const VALID_INTERVIEWER_ROLES: Role[] = [Role.HR, Role.TeamLead];

export class InterviewService {
  // ── CREATE ─────────────────────────────────────────────────────────────────

  /**
   * Schedule a new Interview for an Application at a given Stage.
   * Interview + InterviewerAssignment rows + INTERVIEW_CREATED AuditLog are
   * created inside a single prisma.$transaction.
   *
   * Does NOT modify Application.currentStageId or Application.status.
   */
  static async createInterview(actorId: string, applicationId: string, input: CreateInterviewInput) {
    // Read-only validation outside transaction
    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });
    if (!application) throw new AppError(404, 'Application not found.');

    const stage = await prisma.stage.findUnique({
      where: { id: input.stageId }
    });
    if (!stage) throw new AppError(404, 'Stage not found.');

    if (stage.positionId !== application.positionId) {
      throw new AppError(400, 'Stage does not belong to the same position as this application.');
    }

    // Validate interviewerIds — no duplicates
    const uniqueIds = new Set(input.interviewerIds);
    if (uniqueIds.size !== input.interviewerIds.length) {
      throw new AppError(400, 'Duplicate interviewer IDs are not allowed.');
    }

    // Fetch all interviewers
    const interviewers = await prisma.user.findMany({
      where: { id: { in: input.interviewerIds } }
    });

    if (interviewers.length !== input.interviewerIds.length) {
      throw new AppError(404, 'One or more interviewers not found.');
    }

    const invalidRole = interviewers.find((u) => !VALID_INTERVIEWER_ROLES.includes(u.role));
    if (invalidRole) {
      throw new AppError(400, 'One or more interviewers have an invalid role. Only HR and TeamLead are permitted.');
    }

    // Atomically: create Interview + assignments + audit log
    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          applicationId,
          stageId:     input.stageId,
          scheduledAt: input.scheduledAt,
          location:    input.location    ?? null,
          meetingLink: input.meetingLink ?? null,
          createdById: actorId
        }
      });

      await tx.interviewerAssignment.createMany({
        data: input.interviewerIds.map((interviewerId) => ({
          interviewId:  created.id,
          interviewerId
        }))
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'INTERVIEW_CREATED',
          entityType: 'Interview',
          entityId:   created.id,
          // No candidate personal data stored in audit details
          details:    JSON.stringify({
            applicationId,
            stageId:      input.stageId,
            scheduledAt:  input.scheduledAt,
            interviewerIds: input.interviewerIds
          })
        }
      });

      return created;
    });

    // Return full detail outside transaction (read-only)
    return prisma.interview.findUnique({
      where:   { id: interview.id },
      include: interviewDetailInclude
    });
  }

  // ── LIST ──────────────────────────────────────────────────────────────────

  /**
   * List interviews with optional filters.
   * TeamLead: scoped to interviews they are assigned to.
   * HR / Manager: all interviews.
   */
  static async listInterviews(actor: { id: string; role: Role }, filters: ListInterviewsInput) {
    const where: Record<string, unknown> = {};

    if (filters.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.from || filters.to) {
      where.scheduledAt = {
        ...(filters.from ? { gte: filters.from } : {}),
        ...(filters.to   ? { lte: filters.to }   : {})
      };
    }

    // Narrow TeamLead access to only their assigned interviews
    if (actor.role === Role.TeamLead) {
      where.assignments = { some: { interviewerId: actor.id } };
    }

    return prisma.interview.findMany({
      where,
      include:  interviewListInclude,
      orderBy:  { scheduledAt: 'asc' }
    });
  }

  // ── GET BY ID ─────────────────────────────────────────────────────────────

  /**
   * Retrieve a single Interview by ID.
   * TeamLead: only if they appear in InterviewerAssignment for this interview.
   * HR / Manager: any interview.
   */
  static async getInterviewById(actor: { id: string; role: Role }, interviewId: string) {
    const interview = await prisma.interview.findUnique({
      where:   { id: interviewId },
      include: interviewDetailInclude
    });

    if (!interview) throw new AppError(404, 'Interview not found.');

    // TeamLead scoped access: verify assignment
    if (actor.role === Role.TeamLead) {
      const assignment = await prisma.interviewerAssignment.findUnique({
        where: { interviewId_interviewerId: { interviewId, interviewerId: actor.id } }
      });
      if (!assignment) throw new AppError(403, 'Access denied.');
    }

    return interview;
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────

  /**
   * Update Interview schedule/location/meetingLink.
   * HR only. At least one field required.
   * Interview update + INTERVIEW_UPDATED AuditLog inside prisma.$transaction.
   */
  static async updateInterview(actorId: string, interviewId: string, input: UpdateInterviewInput) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!interview) throw new AppError(404, 'Interview not found.');

    const updatedFields: Record<string, unknown> = {};
    if (input.scheduledAt !== undefined) updatedFields.scheduledAt = input.scheduledAt;
    if (input.location    !== undefined) updatedFields.location    = input.location;
    if (input.meetingLink !== undefined) updatedFields.meetingLink = input.meetingLink;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where:   { id: interviewId },
        data:    updatedFields,
        include: interviewDetailInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'INTERVIEW_UPDATED',
          entityType: 'Interview',
          entityId:   interviewId,
          details:    JSON.stringify({ updatedFields })
        }
      });

      return result;
    });

    return updated;
  }

  // ── STATUS UPDATE ─────────────────────────────────────────────────────────

  /**
   * Update Interview status.
   * HR only. No strict FSM enforced in Sprint 1.
   * Does NOT modify Application.currentStageId or Application.status.
   * Interview status update + INTERVIEW_STATUS_CHANGED AuditLog inside prisma.$transaction.
   */
  static async updateInterviewStatus(actorId: string, interviewId: string, input: UpdateInterviewStatusInput) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!interview) throw new AppError(404, 'Interview not found.');

    const oldStatus = interview.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where:   { id: interviewId },
        data:    { status: input.status },
        include: interviewDetailInclude
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'INTERVIEW_STATUS_CHANGED',
          entityType: 'Interview',
          entityId:   interviewId,
          details:    JSON.stringify({ oldStatus, newStatus: input.status })
        }
      });

      return result;
    });

    return updated;
  }

  // ── INTERVIEWER REPLACEMENT ───────────────────────────────────────────────

  /**
   * Replace all interviewers for an Interview (full replace semantics).
   * HR only.
   * Old InterviewerAssignment rows deleted + new rows created + audit log inside
   * a single prisma.$transaction.
   */
  static async updateInterviewers(actorId: string, interviewId: string, input: UpdateInterviewersInput) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });
    if (!interview) throw new AppError(404, 'Interview not found.');

    // Duplicate check
    const uniqueIds = new Set(input.interviewerIds);
    if (uniqueIds.size !== input.interviewerIds.length) {
      throw new AppError(400, 'Duplicate interviewer IDs are not allowed.');
    }

    // Validate all users exist
    const interviewers = await prisma.user.findMany({
      where: { id: { in: input.interviewerIds } }
    });
    if (interviewers.length !== input.interviewerIds.length) {
      throw new AppError(404, 'One or more interviewers not found.');
    }

    // Validate roles
    const invalidRole = interviewers.find((u) => !VALID_INTERVIEWER_ROLES.includes(u.role));
    if (invalidRole) {
      throw new AppError(400, 'One or more interviewers have an invalid role. Only HR and TeamLead are permitted.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Full replace: delete old assignments then create new
      await tx.interviewerAssignment.deleteMany({
        where: { interviewId }
      });

      await tx.interviewerAssignment.createMany({
        data: input.interviewerIds.map((interviewerId) => ({
          interviewId,
          interviewerId
        }))
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'INTERVIEW_INTERVIEWERS_UPDATED',
          entityType: 'Interview',
          entityId:   interviewId,
          details:    JSON.stringify({ newInterviewerIds: input.interviewerIds })
        }
      });

      return tx.interview.findUnique({
        where:   { id: interviewId },
        include: interviewDetailInclude
      });
    });

    return updated;
  }
}
