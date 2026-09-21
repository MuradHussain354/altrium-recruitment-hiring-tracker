import prisma from '../config/prisma';
import { Prisma, EmailEventType } from '@prisma/client';
import { EmailOutboxService, EnqueueEmailInput } from './email/email-outbox.service';
import {
  ApplicationConfirmationPayload,
  InterviewScheduledPayload,
  InterviewRescheduledPayload,
  InterviewCancelledPayload,
  ApplicationRejectedPayload,
  ApplicationHiredPayload,
  AccountInvitationPayload,
  JobAlertPayload,
  HiringReportDigestPayload,
} from './email/templates';

export class EmailService {
  /**
   * S2-39: Enqueue Application Confirmation Email
   */
  static async sendApplicationConfirmation(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      applicationId: string;
      candidateName: string;
      positionTitle: string;
      department: string;
      trackingUrl?: string;
    }
  ) {
    const payload: ApplicationConfirmationPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      department: data.department,
      applicationId: data.applicationId,
      trackingUrl: data.trackingUrl,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `APPLICATION_CONFIRMATION:${data.applicationId}`,
      eventType: EmailEventType.ApplicationConfirmation,
      recipient: data.recipient,
      subject: `Application Received: ${data.positionTitle} at Altrium`,
      payload,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-40: Enqueue Interview Scheduled Email
   */
  static async sendInterviewScheduled(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      interviewId: string;
      applicationId?: string;
      candidateName: string;
      positionTitle: string;
      stageName: string;
      scheduledAt: Date;
      durationMinutes: number;
      location?: string | null;
      meetingLink?: string | null;
    }
  ) {
    const payload: InterviewScheduledPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      stageName: data.stageName,
      scheduledAt: data.scheduledAt.toISOString(),
      durationMinutes: data.durationMinutes,
      location: data.location,
      meetingLink: data.meetingLink,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `INTERVIEW_SCHEDULED:${data.interviewId}`,
      eventType: EmailEventType.InterviewScheduled,
      recipient: data.recipient,
      subject: `Interview Scheduled: ${data.positionTitle} — Altrium`,
      payload,
      interviewId: data.interviewId,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-41: Enqueue Interview Rescheduled Email
   */
  static async sendInterviewRescheduled(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      interviewId: string;
      applicationId?: string;
      candidateName: string;
      positionTitle: string;
      stageName: string;
      oldScheduledAt: Date;
      newScheduledAt: Date;
      durationMinutes: number;
      location?: string | null;
      meetingLink?: string | null;
    }
  ) {
    const payload: InterviewRescheduledPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      stageName: data.stageName,
      oldScheduledAt: data.oldScheduledAt.toISOString(),
      newScheduledAt: data.newScheduledAt.toISOString(),
      durationMinutes: data.durationMinutes,
      location: data.location,
      meetingLink: data.meetingLink,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `INTERVIEW_RESCHEDULED:${data.interviewId}:${data.newScheduledAt.getTime()}`,
      eventType: EmailEventType.InterviewRescheduled,
      recipient: data.recipient,
      subject: `Interview Rescheduled: ${data.positionTitle} — Altrium`,
      payload,
      interviewId: data.interviewId,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-42: Enqueue Interview Cancelled Email
   */
  static async sendInterviewCancelled(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      interviewId: string;
      applicationId?: string;
      candidateName: string;
      positionTitle: string;
      stageName: string;
      scheduledAt: Date;
      reason?: string | null;
    }
  ) {
    const payload: InterviewCancelledPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      stageName: data.stageName,
      scheduledAt: data.scheduledAt.toISOString(),
      reason: data.reason,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `INTERVIEW_CANCELLED:${data.interviewId}`,
      eventType: EmailEventType.InterviewCancelled,
      recipient: data.recipient,
      subject: `Interview Cancelled: ${data.positionTitle} — Altrium`,
      payload,
      interviewId: data.interviewId,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-43: Enqueue Application Rejection Email
   */
  static async sendApplicationRejected(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      applicationId: string;
      candidateName: string;
      positionTitle: string;
      rejectionDate?: Date;
    }
  ) {
    const payload: ApplicationRejectedPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      rejectionDate: (data.rejectionDate || new Date()).toISOString(),
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `APPLICATION_REJECTED:${data.applicationId}`,
      eventType: EmailEventType.ApplicationRejected,
      recipient: data.recipient,
      subject: `Update regarding your application at Altrium`,
      payload,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-44: Enqueue Application Hired Email
   */
  static async sendApplicationHired(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      applicationId: string;
      candidateName: string;
      positionTitle: string;
      department: string;
    }
  ) {
    const payload: ApplicationHiredPayload = {
      candidateName: data.candidateName,
      positionTitle: data.positionTitle,
      department: data.department,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `APPLICATION_HIRED:${data.applicationId}`,
      eventType: EmailEventType.ApplicationHired,
      recipient: data.recipient,
      subject: `Welcome to Altrium! Offer & Next Steps`,
      payload,
      applicationId: data.applicationId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-45: Enqueue Account Invitation Email
   */
  static async sendAccountInvitation(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      userId: string;
      userName: string;
      role: string;
      encryptedToken: string;
      tokenHash: string;
    }
  ) {
    const payload: AccountInvitationPayload = {
      userName: data.userName,
      userEmail: data.recipient,
      role: data.role,
      encryptedToken: data.encryptedToken,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `ACCOUNT_INVITATION:${data.userId}:${data.tokenHash}`,
      eventType: EmailEventType.AccountInvitation,
      recipient: data.recipient,
      subject: `Invitation to join Altrium Recruitment Platform`,
      payload,
      userId: data.userId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-07: Enqueue Job Alert Email
   */
  static async sendJobAlert(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      subscriptionId: string;
      positionId: string;
      positionTitle: string;
      department: string;
      location?: string | null;
      jobUrl?: string;
    }
  ) {
    const payload: JobAlertPayload = {
      positionId: data.positionId,
      subscriptionId: data.subscriptionId,
      positionTitle: data.positionTitle,
      department: data.department,
      location: data.location,
      jobUrl: data.jobUrl,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `JOB_ALERT:${data.positionId}:${data.subscriptionId}`,
      eventType: EmailEventType.JobAlert,
      recipient: data.recipient,
      subject: `New Job Opening: ${data.positionTitle} at Altrium`,
      payload,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }

  /**
   * S2-27: Enqueue Hiring Report Digest Email
   */
  static async sendHiringReportDigest(
    tx: Prisma.TransactionClient | typeof prisma,
    data: {
      recipient: string;
      managerId: string;
      managerName: string;
      dateKey: string; // YYYY-MM-DD
      openPositionsCount: number;
      inProgressCount: number;
      interviewsCount: number;
      pendingOffersCount: number;
      agingCount: number;
      dashboardUrl?: string;
    }
  ) {
    const payload: HiringReportDigestPayload = {
      managerName: data.managerName,
      openPositionsCount: data.openPositionsCount,
      inProgressCount: data.inProgressCount,
      interviewsCount: data.interviewsCount,
      pendingOffersCount: data.pendingOffersCount,
      agingCount: data.agingCount,
      dashboardUrl: data.dashboardUrl,
    };

    const input: EnqueueEmailInput = {
      idempotencyKey: `HIRING_DIGEST:${data.managerId}:${data.dateKey}`,
      eventType: EmailEventType.HiringReportDigest,
      recipient: data.recipient,
      subject: `Altrium Weekly Executive Hiring Digest`,
      payload,
      userId: data.managerId,
    };

    const log = await EmailOutboxService.enqueueEmailWithinTransaction(tx, input);
    if (log) {
      EmailOutboxService.dispatchImmediate(log.id);
    }
    return log;
  }
}
