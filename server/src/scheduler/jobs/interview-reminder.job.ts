import prisma from '../../config/prisma';
import {
  InterviewStatus,
  InvitationStatus,
  NotificationChannel,
  NotificationType,
  RecipientType
} from '@prisma/client';

export interface ProcessRemindersResult {
  checkedCount: number;
  remindersCreated: number;
}

/**
 * Checks for upcoming interviews (approximately 24 hours before scheduledAt, 23h-25h window),
 * and creates InApp FeedbackReminder notifications for eligible active interviewers who haven't
 * submitted feedback or declined.
 *
 * Idempotent: checks (interviewId, recipientId, FeedbackReminder).
 */
export async function processInterviewReminders(
  referenceDate: Date = new Date()
): Promise<ProcessRemindersResult> {
  const windowStart = new Date(referenceDate.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(referenceDate.getTime() + 25 * 60 * 60 * 1000);

  const eligibleInterviews = await prisma.interview.findMany({
    where: {
      status: InterviewStatus.Scheduled,
      scheduledAt: {
        gte: windowStart,
        lte: windowEnd
      }
    },
    include: {
      assignments: {
        include: {
          interviewer: true
        }
      },
      feedbacks: true
    }
  });

  let remindersCreated = 0;

  for (const interview of eligibleInterviews) {
    for (const assignment of interview.assignments) {
      // 1. Must not have declined
      if (assignment.invitationStatus === InvitationStatus.Declined) {
        continue;
      }

      // 2. Must not be delegated to another interviewer
      if (assignment.delegatedToId) {
        continue;
      }

      // 3. Interviewer must be active
      if (!assignment.interviewer || !assignment.interviewer.isActive) {
        continue;
      }

      // 4. Feedback must not already be submitted by this interviewer
      const hasFeedback =
        assignment.feedbackSubmitted ||
        interview.feedbacks.some((f) => f.interviewerId === assignment.interviewerId);
      if (hasFeedback) {
        continue;
      }

      // 5. Idempotency: Check if a FeedbackReminder already exists for this (interviewId, recipientId)
      const existingReminder = await prisma.notification.findFirst({
        where: {
          interviewId: interview.id,
          recipientId: assignment.interviewerId,
          type: NotificationType.FeedbackReminder
        }
      });

      if (existingReminder) {
        continue;
      }

      // Create reminder notification
      await prisma.notification.create({
        data: {
          recipientType: RecipientType.User,
          recipientId: assignment.interviewerId,
          type: NotificationType.FeedbackReminder,
          channel: NotificationChannel.InApp,
          interviewId: interview.id,
          applicationId: interview.applicationId,
          isRead: false
        }
      });

      remindersCreated++;
    }
  }

  return {
    checkedCount: eligibleInterviews.length,
    remindersCreated
  };
}
