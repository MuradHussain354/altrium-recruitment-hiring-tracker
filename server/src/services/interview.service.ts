import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role, RecipientType, NotificationType, NotificationChannel, InterviewStatus } from '@prisma/client';
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
  questionSet: {
    select: { id: true, title: true, category: true }
  },
  assignments: {
    select: {
      id:                true,
      feedbackSubmitted: true,
      invitationStatus:  true,
      declineReason:     true,
      respondedAt:       true,
      assignedAt:        true,
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
  questionSet: {
    include: {
      questions: { orderBy: { sequenceOrder: 'asc' } }
    }
  },
  assignments: {
    select: {
      id:                true,
      feedbackSubmitted: true,
      invitationStatus:  true,
      declineReason:     true,
      respondedAt:       true,
      assignedAt:        true,
      interviewer:       { select: { id: true, name: true, role: true } },
      delegatedTo:       { select: { id: true, name: true, role: true } }
    }
  },
  feedbacks: {
    include: {
      interviewer: { select: { id: true, name: true, role: true } },
      criterionScores: true
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

    // S2-13: Time-range conflict detection for each assigned interviewer
    if (input.scheduledAt) {
      const durationMs = (input.durationMinutes ?? 60) * 60 * 1000;
      const newStart = input.scheduledAt.getTime();
      const newEnd = newStart + durationMs;
      const conflicts = await InterviewService.checkConflicts(
        input.interviewerIds,
        newStart,
        newEnd,
        undefined
      );
      if (conflicts.length > 0) {
        const c = conflicts[0];
        throw new AppError(
          409,
          `Scheduling conflict: ${c.interviewerName} is already assigned to an interview from ${c.existingStart} to ${c.existingEnd}.`
        );
      }
    }

    // Atomically: create Interview + assignments + audit log
    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          applicationId,
          stageId:         input.stageId,
          scheduledAt:     input.scheduledAt,
          durationMinutes: input.durationMinutes ?? 60,
          location:        input.location    ?? null,
          meetingLink:     input.meetingLink ?? null,
          questionSetId:   input.questionSetId ?? null,
          createdById:     actorId
        }
      });

      await tx.interviewerAssignment.createMany({
        data: input.interviewerIds.map((interviewerId) => ({
          interviewId:  created.id,
          interviewerId
        }))
      });

      // Create notification records for all assigned internal interviewers
      if (input.interviewerIds.length > 0) {
        await tx.notification.createMany({
          data: input.interviewerIds.map((interviewerId) => ({
            applicationId,
            interviewId:   created.id,
            recipientType: RecipientType.User,
            recipientId:   interviewerId,
            type:          NotificationType.InterviewScheduled,
            channel:       NotificationChannel.InApp
          }))
        });
      }

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
    if (input.durationMinutes !== undefined) updatedFields.durationMinutes = input.durationMinutes;
    if (input.location    !== undefined) updatedFields.location    = input.location;
    if (input.meetingLink !== undefined) updatedFields.meetingLink = input.meetingLink;
    if (input.questionSetId !== undefined) updatedFields.questionSetId = input.questionSetId;

    // S2-13: Conflict check on reschedule
    if (input.scheduledAt !== undefined || input.durationMinutes !== undefined) {
      const effectiveScheduledAt = input.scheduledAt ?? interview.scheduledAt;
      const effectiveDuration = input.durationMinutes ?? interview.durationMinutes ?? 60;
      if (effectiveScheduledAt) {
        const startMs = effectiveScheduledAt.getTime();
        const endMs = startMs + effectiveDuration * 60 * 1000;
        const assignments = await prisma.interviewerAssignment.findMany({
          where: { interviewId },
          select: { interviewerId: true }
        });
        const interviewerIds = assignments.map((a) => a.interviewerId);
        if (interviewerIds.length > 0) {
          const conflicts = await InterviewService.checkConflicts(interviewerIds, startMs, endMs, interviewId);
          if (conflicts.length > 0) {
            const c = conflicts[0];
            throw new AppError(
              409,
              `Scheduling conflict: ${c.interviewerName} is already assigned to an interview from ${c.existingStart} to ${c.existingEnd}.`
            );
          }
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.interview.update({
        where:   { id: interviewId },
        data:    updatedFields,
        include: interviewDetailInclude
      });

      // R-03 Option B: Invalidate previous FeedbackReminder notifications when interview is rescheduled
      if (input.scheduledAt !== undefined) {
        await tx.notification.deleteMany({
          where: {
            interviewId,
            type: NotificationType.FeedbackReminder
          }
        });
      }

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
   * Update interviewers for an Interview using a diff-based strategy.
   * HR only.
   *
   * Retained assignments are preserved untouched (retaining id, assignedAt, feedbackSubmitted).
   * If any removed interviewer has feedbackSubmitted === true, the operation is rejected with 409 Conflict.
   * Deleted and newly added assignments + audit log execute inside a single prisma.$transaction.
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

    // Fetch all existing assignments
    const existingAssignments = await prisma.interviewerAssignment.findMany({
      where: { interviewId }
    });
    const existingIds = existingAssignments.map((a) => a.interviewerId);

    // Compute differences
    const newIds = input.interviewerIds;
    const removedAssignments = existingAssignments.filter((a) => !newIds.includes(a.interviewerId));
    const addedIds = newIds.filter((id) => !existingIds.includes(id));
    const retainedIds = existingIds.filter((id) => newIds.includes(id));

    // Reject if removing any interviewer who has already submitted feedback
    const removingSubmitted = removedAssignments.some((a) => a.feedbackSubmitted);
    if (removingSubmitted) {
      throw new AppError(
        409,
        'Cannot replace interviewers: One or more assigned interviewers have already submitted feedback and cannot be removed.'
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete only removed non-submitted assignments
      if (removedAssignments.length > 0) {
        await tx.interviewerAssignment.deleteMany({
          where: {
            interviewId,
            interviewerId: { in: removedAssignments.map((a) => a.interviewerId) }
          }
        });
      }

      // 2. Create only newly added assignments
      if (addedIds.length > 0) {
        await tx.interviewerAssignment.createMany({
          data: addedIds.map((interviewerId) => ({
            interviewId,
            interviewerId
          }))
        });

        // Create notification records for newly added interviewers only
        await tx.notification.createMany({
          data: addedIds.map((interviewerId) => ({
            applicationId: interview.applicationId,
            interviewId,
            recipientType: RecipientType.User,
            recipientId:   interviewerId,
            type:          NotificationType.InterviewScheduled,
            channel:       NotificationChannel.InApp
          }))
        });
      }

      // 3. Record AuditLog in the same transaction
      await tx.auditLog.create({
        data: {
          actorId,
          actionType: 'INTERVIEW_INTERVIEWERS_UPDATED',
          entityType: 'Interview',
          entityId:   interviewId,
          details:    JSON.stringify({
            addedInterviewerIds:    addedIds,
            removedInterviewerIds:  removedAssignments.map((a) => a.interviewerId),
            retainedInterviewerIds: retainedIds
          })
        }
      });

      return tx.interview.findUnique({
        where:   { id: interviewId },
        include: interviewDetailInclude
      });
    });

    return updated;
  }

  // ── CONFLICT DETECTION ────────────────────────────────────────────────────

  /**
   * Exact time-range overlap check for given interviewer IDs.
   * Logic: newStart < existingEnd AND newEnd > existingStart
   * Returns all conflicts found.
   */
  static async checkConflicts(
    interviewerIds: string[],
    newStart: number,
    newEnd: number,
    excludeInterviewId?: string
  ) {
    const conflicts: {
      interviewerId: string;
      interviewerName: string;
      existingInterviewId: string;
      existingStart: string;
      existingEnd: string;
    }[] = [];

    for (const interviewerId of interviewerIds) {
      const existingInterviews = await prisma.interview.findMany({
        where: {
          status: { not: InterviewStatus.Cancelled },
          scheduledAt: { not: null },
          assignments: { some: { interviewerId } },
          ...(excludeInterviewId ? { id: { not: excludeInterviewId } } : {})
        },
        include: {
          assignments: {
            where: { interviewerId },
            include: { interviewer: { select: { name: true } } }
          }
        }
      });

      for (const existing of existingInterviews) {
        if (!existing.scheduledAt) continue;
        const existStart = existing.scheduledAt.getTime();
        const existEnd = existStart + existing.durationMinutes * 60 * 1000;
        // Exact overlap: newStart < existingEnd AND newEnd > existingStart
        if (newStart < existEnd && newEnd > existStart) {
          const assignmentUser = existing.assignments[0]?.interviewer;
          conflicts.push({
            interviewerId,
            interviewerName: assignmentUser?.name ?? interviewerId,
            existingInterviewId: existing.id,
            existingStart: new Date(existStart).toISOString(),
            existingEnd: new Date(existEnd).toISOString()
          });
        }
      }
    }

    return conflicts;
  }

  // ── INVITATION RESPONSE ───────────────────────────────────────────────────

  /**
   * Team Lead accepts or declines their interview invitation.
   * Strict actor ownership: actor.id must match assignment.interviewerId.
   */
  static async respondToInvitation(
    actor: { id: string; role: Role },
    interviewId: string,
    status: 'Accepted' | 'Declined',
    declineReason?: string
  ) {
    if (actor.role !== Role.TeamLead) {
      throw new AppError(403, 'Access denied. Only TeamLeads can respond to interview invitations.');
    }

    const assignment = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId, interviewerId: actor.id } }
    });

    if (!assignment) {
      throw new AppError(403, 'Access denied. You are not assigned to this interview.');
    }

    if (assignment.interviewerId !== actor.id) {
      throw new AppError(403, 'Access denied. You cannot respond on behalf of another interviewer.');
    }

    if (status === 'Declined' && (!declineReason || declineReason.trim().length === 0)) {
      throw new AppError(400, 'A decline reason is required when declining an invitation.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.interviewerAssignment.update({
        where: { interviewId_interviewerId: { interviewId, interviewerId: actor.id } },
        data: {
          invitationStatus: status as any,
          declineReason: status === 'Declined' ? declineReason : null,
          respondedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: `INVITATION_${status.toUpperCase()}`,
          entityType: 'InterviewerAssignment',
          entityId: result.id,
          details: JSON.stringify({ interviewId, declineReason: declineReason ?? null })
        }
      });

      return result;
    });

    return updated;
  }

  // ── DELEGATE INTERVIEW ────────────────────────────────────────────────────

  /**
   * HR or current Team Lead delegates their interview assignment to another Team Lead.
   * Historical feedback is preserved. Audit log records delegation.
   */
  static async delegateInterview(
    actor: { id: string; role: Role },
    interviewId: string,
    targetInterviewerId: string
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { assignments: true }
    });

    if (!interview) throw new AppError(404, 'Interview not found.');

    // Determine source assignment: actor must either be HR or be the assigned interviewer
    const sourceAssignment = interview.assignments.find(
      (a) => a.interviewerId === actor.id
    );

    if (actor.role !== Role.HR && !sourceAssignment) {
      throw new AppError(403, 'Access denied. You are not assigned to this interview and are not HR.');
    }

    // Validate target interviewer
    const targetUser = await prisma.user.findUnique({ where: { id: targetInterviewerId } });
    if (!targetUser) throw new AppError(404, 'Target interviewer not found.');
    if (targetUser.role !== Role.TeamLead) {
      throw new AppError(400, 'Delegation target must be a Team Lead.');
    }

    // Cannot delegate to someone already assigned
    const alreadyAssigned = interview.assignments.find((a) => a.interviewerId === targetInterviewerId);
    if (alreadyAssigned) {
      throw new AppError(409, 'Target Team Lead is already assigned to this interview.');
    }

    // Cannot delegate if feedback already submitted by source
    if (sourceAssignment?.feedbackSubmitted) {
      throw new AppError(409, 'Cannot delegate: you have already submitted feedback for this interview.');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Record delegation link on source assignment if source exists
      if (sourceAssignment) {
        await tx.interviewerAssignment.update({
          where: { id: sourceAssignment.id },
          data: { delegatedToId: targetInterviewerId }
        });
      }

      // Create new assignment for target
      const newAssignment = await tx.interviewerAssignment.create({
        data: { interviewId, interviewerId: targetInterviewerId }
      });

      // Notification for new assignee
      await tx.notification.create({
        data: {
          applicationId: interview.applicationId,
          interviewId,
          recipientType: RecipientType.User,
          recipientId: targetInterviewerId,
          type: NotificationType.InterviewScheduled,
          channel: NotificationChannel.InApp
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actionType: 'INTERVIEW_DELEGATED',
          entityType: 'InterviewerAssignment',
          entityId: newAssignment.id,
          details: JSON.stringify({
            interviewId,
            fromInterviewerId: actor.id,
            toInterviewerId: targetInterviewerId
          })
        }
      });

      return tx.interview.findUnique({
        where: { id: interviewId },
        include: interviewDetailInclude
      });
    });

    return result;
  }

  // ── PERSONAL INTERVIEW HISTORY ────────────────────────────────────────────

  /**
   * Retrieve a Team Lead's personal interview history with submitted feedbacks.
   */
  static async getMyInterviewHistory(
    actor: { id: string; role: Role },
    filters: { status?: string; from?: Date; to?: Date }
  ) {
    if (actor.role !== Role.TeamLead) {
      throw new AppError(403, 'Access denied. Only Team Leads can access personal interview history.');
    }

    const where: any = {
      assignments: { some: { interviewerId: actor.id } }
    };

    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.scheduledAt = {};
      if (filters.from) where.scheduledAt.gte = filters.from;
      if (filters.to) where.scheduledAt.lte = filters.to;
    }

    return prisma.interview.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            status: true,
            candidate: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } }
          }
        },
        stage: { select: { id: true, name: true, sequenceOrder: true } },
        questionSet: {
          include: { questions: { orderBy: { sequenceOrder: 'asc' } } }
        },
        assignments: {
          where: { interviewerId: actor.id },
          select: {
            id: true,
            feedbackSubmitted: true,
            invitationStatus: true,
            respondedAt: true
          }
        },
        feedbacks: {
          where: { interviewerId: actor.id },
          include: { criterionScores: true }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  // ── CONSOLIDATED FEEDBACK & AGGREGATED SCORE ──────────────────────────────

  /**
   * Return consolidated feedback across all interviews for an application.
   * Calculates deterministic weighted aggregate score from FeedbackCriterionScore.
   */
  static async getConsolidatedFeedback(
    actor: { id: string; role: Role },
    applicationId: string
  ) {
    if (actor.role !== Role.HR && actor.role !== Role.Manager) {
      throw new AppError(403, 'Access denied.');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });
    if (!application) throw new AppError(404, 'Application not found.');

    const interviews = await prisma.interview.findMany({
      where: { applicationId },
      include: {
        stage: { select: { id: true, name: true, sequenceOrder: true } },
        feedbacks: {
          include: {
            interviewer: { select: { id: true, name: true, role: true } },
            criterionScores: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    // Deterministic weighted aggregate score from persisted FeedbackCriterionScore rows
    let totalWeight = 0;
    let weightedSum = 0;

    for (const interview of interviews) {
      for (const feedback of interview.feedbacks) {
        for (const cs of feedback.criterionScores) {
          const w = Number(cs.weight) || 1.0;
          const s = Number(cs.score);
          weightedSum += s * w;
          totalWeight += w;
        }
      }
    }

    const aggregateScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 100) / 100
      : null;

    return {
      applicationId,
      aggregateScore,
      interviews: interviews.map((i) => ({
        interviewId: i.id,
        stageId: i.stageId,
        stageName: i.stage.name,
        stageOrder: i.stage.sequenceOrder,
        scheduledAt: i.scheduledAt,
        status: i.status,
        feedbacks: i.feedbacks.map((f) => ({
          feedbackId: f.id,
          interviewerId: f.interviewerId,
          interviewerName: f.interviewer.name,
          overallRating: f.overallRating,
          comments: f.comments,
          submittedAt: f.submittedAt,
          criterionScores: f.criterionScores.map((cs) => ({
            criterionName: cs.criterionName,
            weight: Number(cs.weight),
            score: Number(cs.score),
            weightedScore: Number(cs.score) * Number(cs.weight)
          }))
        }))
      }))
    };
  }
}
