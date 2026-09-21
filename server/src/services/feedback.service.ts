import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';
import { SubmitFeedbackInput } from '../schemas/feedback.schema';
import { Prisma } from '@prisma/client';

const feedbackInclude = {
  interviewer: {
    select: { id: true, name: true, role: true }
  },
  criterionScores: {
    select: { id: true, criterionName: true, weight: true, score: true }
  }
} as const;

export class FeedbackService {
  /**
   * Submit feedback and criterion scores for an Interview.
   * Actor must be an assigned TeamLead.
   * Executed atomically inside a single prisma.$transaction:
   * 1. Create Feedback
   * 2. Create FeedbackCriterionScore(s)
   * 3. Update InterviewerAssignment.feedbackSubmitted = true
   * 4. Create FEEDBACK_SUBMITTED AuditLog
   */
  static async submitFeedback(
    actor: { id: string; role: Role },
    interviewId: string,
    input: SubmitFeedbackInput
  ) {
    if (actor.role !== Role.TeamLead) {
      throw new AppError(403, 'Access denied. Only assigned TeamLeads can submit feedback.');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found.');
    }

    // Verify interviewer assignment exists for this actor
    const assignment = await prisma.interviewerAssignment.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId,
          interviewerId: actor.id
        }
      }
    });

    if (!assignment) {
      throw new AppError(403, 'Access denied. You are not assigned as an interviewer for this interview.');
    }

    // Friendly pre-check for duplicate feedback
    if (assignment.feedbackSubmitted) {
      throw new AppError(409, 'Feedback has already been submitted for this interview.');
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: {
        interviewId_interviewerId: {
          interviewId,
          interviewerId: actor.id
        }
      }
    });

    if (existingFeedback) {
      throw new AppError(409, 'Feedback has already been submitted for this interview.');
    }

    try {
      const createdFeedback = await prisma.$transaction(async (tx) => {
        // 1. Create Feedback
        const feedback = await tx.feedback.create({
          data: {
            interviewId,
            interviewerId: actor.id,
            overallRating: input.overallRating !== undefined ? new Prisma.Decimal(input.overallRating) : null,
            comments:      input.comments ?? null
          }
        });

        // 2. Validate and create FeedbackCriterionScore rows
        if (input.criterionScores && input.criterionScores.length > 0) {
          for (const c of input.criterionScores) {
            const scoreNum = Number(c.score);
            if (isNaN(scoreNum) || scoreNum < 1.0 || scoreNum > 5.0) {
              throw new AppError(400, `Invalid criterion score for "${c.criterionName}". Score must be between 1.0 and 5.0.`);
            }
            const weightNum = c.weight !== undefined ? Number(c.weight) : 1.0;
            if (isNaN(weightNum) || weightNum <= 0 || weightNum > 10.0) {
              throw new AppError(400, `Invalid weight for "${c.criterionName}". Weight must be a positive number up to 10.0.`);
            }
          }

          await tx.feedbackCriterionScore.createMany({
            data: input.criterionScores.map((c) => ({
              feedbackId:    feedback.id,
              criterionName: c.criterionName,
              weight:        c.weight !== undefined ? new Prisma.Decimal(c.weight) : new Prisma.Decimal(1.0),
              score:         new Prisma.Decimal(c.score)
            }))
          });
        }

        // 3. Mark assignment as feedback submitted
        await tx.interviewerAssignment.update({
          where: {
            interviewId_interviewerId: {
              interviewId,
              interviewerId: actor.id
            }
          },
          data: {
            feedbackSubmitted: true
          }
        });

        // 4. Record AuditLog (no candidate PII or comments in audit details)
        await tx.auditLog.create({
          data: {
            actorId:    actor.id,
            actionType: 'FEEDBACK_SUBMITTED',
            entityType: 'Feedback',
            entityId:   feedback.id,
            details:    JSON.stringify({
              interviewId,
              applicationId: interview.applicationId,
              overallRating: input.overallRating ?? null,
              criteriaCount: input.criterionScores?.length ?? 0
            })
          }
        });

        return feedback;
      });

      return prisma.feedback.findUnique({
        where:   { id: createdFeedback.id },
        include: feedbackInclude
      });
    } catch (error: any) {
      // Catch concurrent race condition on composite unique constraint
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'Feedback has already been submitted for this interview.');
      }
      throw error;
    }
  }

  /**
   * Retrieve feedback for an interview.
   * HR & Manager: view all feedback for the interview.
   * TeamLead: must be assigned to the interview; returns ONLY their own submitted feedback.
   */
  static async getFeedbacksForInterview(
    actor: { id: string; role: Role },
    interviewId: string
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found.');
    }

    if (actor.role === Role.TeamLead) {
      // Must be assigned to the interview
      const assignment = await prisma.interviewerAssignment.findUnique({
        where: {
          interviewId_interviewerId: {
            interviewId,
            interviewerId: actor.id
          }
        }
      });

      if (!assignment) {
        throw new AppError(403, 'Access denied.');
      }

      // TeamLead only sees their own feedback (no peer visibility)
      return prisma.feedback.findMany({
        where: {
          interviewId,
          interviewerId: actor.id
        },
        include: feedbackInclude,
        orderBy: { submittedAt: 'desc' }
      });
    }

    // HR & Manager: full visibility across all submitted feedback for the interview
    return prisma.feedback.findMany({
      where: { interviewId },
      include: feedbackInclude,
      orderBy: { submittedAt: 'desc' }
    });
  }
}
