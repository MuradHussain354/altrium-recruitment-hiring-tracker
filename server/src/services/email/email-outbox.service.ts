import prisma from '../../config/prisma';
import { Prisma, EmailEventType, EmailDeliveryStatus } from '@prisma/client';
import { IEmailProvider, SendEmailResult } from './email-provider.interface';
import { ResendProviderAdapter } from './resend-provider.adapter';
import { MockProviderAdapter } from './mock-provider.adapter';
import { decryptEmailToken } from '../../utils/email-crypto';
import { sanitizeHeader } from './templates/master-layout';
import {
  renderApplicationConfirmation,
  renderInterviewScheduled,
  renderInterviewRescheduled,
  renderInterviewCancelled,
  renderApplicationRejected,
  renderApplicationHired,
  renderAccountInvitation,
  renderJobAlert,
  renderHiringReportDigest,
} from './templates';

export interface EnqueueEmailInput {
  idempotencyKey: string;
  eventType: EmailEventType;
  recipient: string;
  subject: string;
  payload: any;
  applicationId?: string | null;
  interviewId?: string | null;
  userId?: string | null;
}

export class EmailOutboxService {
  private static providerInstance: IEmailProvider | null = null;
  private static sendingTimeoutMs = parseInt(process.env.OUTBOX_SENDING_TIMEOUT_MS || '300000', 10); // 5 min default

  /**
   * Initializes or returns the active email provider.
   * Uses Resend if RESEND_API_KEY is defined and not in test mode; otherwise MockProviderAdapter.
   */
  static getProvider(): IEmailProvider {
    if (!this.providerInstance) {
      if (process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
        this.providerInstance = new ResendProviderAdapter();
      } else {
        this.providerInstance = new MockProviderAdapter();
      }
    }
    return this.providerInstance;
  }

  /**
   * Allows setting a custom provider adapter (e.g. for testing).
   */
  static setProvider(provider: IEmailProvider): void {
    this.providerInstance = provider;
  }

  /**
   * Resets the provider back to default configuration.
   */
  static resetProvider(): void {
    this.providerInstance = null;
  }

  /**
   * Transactional outbox creation: writes an EmailDeliveryLog inside an existing transaction (or default prisma).
   * If a record with the same idempotencyKey already exists, skips or returns the existing record.
   */
  static async enqueueEmailWithinTransaction(
    tx: Prisma.TransactionClient | typeof prisma,
    input: EnqueueEmailInput
  ) {
    try {
      const existing = await tx.emailDeliveryLog.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existing) {
        return existing;
      }

      return await tx.emailDeliveryLog.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          eventType: input.eventType,
          recipient: input.recipient.toLowerCase().trim(),
          subject: input.subject,
          payload: input.payload,
          status: EmailDeliveryStatus.Pending,
          nextAttemptAt: new Date(),
          applicationId: input.applicationId ?? null,
          interviewId: input.interviewId ?? null,
          userId: input.userId ?? null,
        },
      });
    } catch (err: any) {
      // Catch unique constraint conflict gracefully
      if (err.code === 'P2002') {
        return await tx.emailDeliveryLog.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
      }
      throw err;
    }
  }

  /**
   * Fast-path sub-second delivery: called immediately after database transaction commit.
   * Safe fire-and-forget: never throws or fails the caller.
   */
  static dispatchImmediate(logId: string): void {
    setImmediate(async () => {
      try {
        await this.processLogRecord(logId);
      } catch (err) {
        console.error(`[EmailOutbox] Immediate dispatch error for ${logId}:`, err);
      }
    });
  }

  /**
   * Core outbox processor: claims a record atomically, renders its template, dispatches via provider,
   * and transitions state to Sent or Failed with backoff.
   */
  static async processLogRecord(logId: string): Promise<boolean> {
    // 1. Atomic claim via conditional update: only claim if Pending or Failed
    const claim = await prisma.emailDeliveryLog.updateMany({
      where: {
        id: logId,
        status: { in: [EmailDeliveryStatus.Pending, EmailDeliveryStatus.Failed] },
      },
      data: {
        status: EmailDeliveryStatus.Sending,
        lastAttemptAt: new Date(),
      },
    });

    if (claim.count === 0) {
      // Record already claimed by another worker or in-flight
      return false;
    }

    // 2. Fetch full record with payload
    const log = await prisma.emailDeliveryLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return false;
    }

    // Version stamp captured at claim time: retryCount is only ever mutated by
    // a terminal transition (Sent/Failed) or by recoverStuckSending() reclaiming
    // an abandoned "Sending" row. Every finalize write below is guarded by
    // `retryCount: claimedRetryCount` so a stale worker whose record was
    // reclaimed out from under it (see recoverStuckSending) fails to finalize
    // instead of blindly overwriting whatever state the reclaim already set.
    const claimedRetryCount = log.retryCount;

    // 3. Render template according to eventType
    let rendered: { subject: string; html: string; text?: string };
    try {
      rendered = await this.renderTemplateForEvent(log);
    } catch (renderError: any) {
      console.error(`[EmailOutbox] Template render failed for log ${log.id}:`, renderError);
      // Permanent failure on render error
      const finalized = await this.finalize(logId, claimedRetryCount, {
        status: EmailDeliveryStatus.Failed,
        errorMessage: `Template rendering error: ${renderError.message}`,
        retryCount: claimedRetryCount + 1,
        nextAttemptAt: null,
      });
      return false && finalized;
    }

    // 4. Dispatch through email provider. Subject is passed through
    // sanitizeHeader() defensively even though delivery goes through the
    // provider's JSON HTTP API rather than raw SMTP — CRLF/header-injection
    // protection stays active rather than dead code.
    const provider = this.getProvider();
    let result: SendEmailResult;
    try {
      result = await provider.sendEmail({
        to: log.recipient,
        subject: sanitizeHeader(rendered.subject),
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: log.idempotencyKey,
      });
    } catch (dispatchErr: any) {
      result = {
        success: false,
        error: {
          message: dispatchErr.message || 'Unknown provider exception',
          isPermanent: false,
        },
      };
    }

    const nextRetryCount = claimedRetryCount + 1;

    // 5. Handle result state transitions. Every finalize write is a
    // status+retryCount-guarded compare-and-set (see finalize()) so a stale
    // worker whose record was reclaimed by recoverStuckSending() in the
    // meantime cannot clobber the reclaimed state.
    if (result.success) {
      const finalized = await this.finalize(logId, claimedRetryCount, {
        status: EmailDeliveryStatus.Sent,
        sentAt: new Date(),
        providerMessageId: result.messageId ?? null,
        errorMessage: null,
        nextAttemptAt: null,
      });
      return finalized;
    }

    // Handle failure: permanent vs transient
    const isPermanent = result.error?.isPermanent ?? false;

    if (isPermanent) {
      await this.finalize(logId, claimedRetryCount, {
        status: EmailDeliveryStatus.Failed,
        errorMessage: result.error?.message || 'Permanent delivery failure',
        retryCount: nextRetryCount,
        nextAttemptAt: null, // No automatic retry
      });
      return false;
    }

    // Transient failure: compute exponential backoff
    // Attempt 1: +5m, Attempt 2: +15m, Attempt 3: +45m, Attempt >=4: exhausted
    let nextAttemptAt: Date | null = null;
    if (nextRetryCount === 1) {
      nextAttemptAt = new Date(Date.now() + 5 * 60 * 1000);
    } else if (nextRetryCount === 2) {
      nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000);
    } else if (nextRetryCount === 3) {
      nextAttemptAt = new Date(Date.now() + 45 * 60 * 1000);
    } else {
      nextAttemptAt = null; // Retries exhausted
    }

    await this.finalize(logId, claimedRetryCount, {
      status: EmailDeliveryStatus.Failed,
      errorMessage: result.error?.message || 'Transient delivery failure',
      retryCount: nextRetryCount,
      nextAttemptAt,
    });

    return false;
  }

  /**
   * Stale-worker-safe finalize: only transitions Sending -> (Sent|Failed) if the
   * record's retryCount still matches the version this worker observed at claim
   * time. If recoverStuckSending() has already reclaimed the record (which bumps
   * retryCount), this compare-and-set matches zero rows and the stale worker's
   * result is discarded instead of overwriting the reclaimed state.
   */
  private static async finalize(
    logId: string,
    claimedRetryCount: number,
    data: Prisma.EmailDeliveryLogUpdateManyMutationInput
  ): Promise<boolean> {
    const result = await prisma.emailDeliveryLog.updateMany({
      where: {
        id: logId,
        status: EmailDeliveryStatus.Sending,
        retryCount: claimedRetryCount,
      },
      data,
    });

    if (result.count === 0) {
      console.warn(
        `[EmailOutbox] Stale worker for ${logId} could not finalize — record was already reclaimed/reprocessed.`
      );
      return false;
    }

    return true;
  }

  /**
   * Renders the event template, performing safe secret decryption or lookup where required.
   */
  private static async renderTemplateForEvent(
    log: any
  ): Promise<{ subject: string; html: string; text?: string }> {
    const payload = log.payload as any;

    switch (log.eventType) {
      case EmailEventType.ApplicationConfirmation:
        return renderApplicationConfirmation(payload);

      case EmailEventType.InterviewScheduled:
        return renderInterviewScheduled(payload);

      case EmailEventType.InterviewRescheduled:
        return renderInterviewRescheduled(payload);

      case EmailEventType.InterviewCancelled:
        return renderInterviewCancelled(payload);

      case EmailEventType.ApplicationRejected:
        return renderApplicationRejected(payload);

      case EmailEventType.ApplicationHired:
        return renderApplicationHired(payload);

      case EmailEventType.AccountInvitation: {
        // Decrypt rawToken in transient memory
        if (!payload.encryptedToken) {
          throw new Error('Account invitation payload missing encryptedToken.');
        }
        const rawToken = decryptEmailToken(payload.encryptedToken);
        return renderAccountInvitation(payload, rawToken);
      }

      case EmailEventType.JobAlert: {
        // Load subscription by subscriptionId to retrieve secret unsubscribeToken
        if (!payload.subscriptionId) {
          throw new Error('Job alert payload missing subscriptionId.');
        }
        const subscription = await prisma.jobAlertSubscription.findUnique({
          where: { id: payload.subscriptionId },
          select: { unsubscribeToken: true },
        });
        if (!subscription) {
          throw new Error(`Job alert subscription ${payload.subscriptionId} not found.`);
        }
        return renderJobAlert(payload, subscription.unsubscribeToken);
      }

      case EmailEventType.HiringReportDigest:
        return renderHiringReportDigest(payload);

      default:
        throw new Error(`Unsupported email event type: ${log.eventType}`);
    }
  }

  /**
   * Background sweeper: checks for pending or retryable failed records.
   */
  static async sweepPendingAndRetryable(limit = 50): Promise<number> {
    const now = new Date();
    const records = await prisma.emailDeliveryLog.findMany({
      where: {
        OR: [
          { status: EmailDeliveryStatus.Pending },
          {
            status: EmailDeliveryStatus.Failed,
            nextAttemptAt: { lte: now },
            retryCount: { lt: 4 },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let processedCount = 0;
    for (const rec of records) {
      try {
        await this.processLogRecord(rec.id);
        processedCount++;
      } catch (err) {
        console.error(`[EmailOutbox] Error during sweep for record ${rec.id}:`, err);
      }
    }

    return processedCount;
  }

  /**
   * Stuck Sending recovery: reclaims records in Sending state whose lastAttemptAt is older than timeout.
   */
  static async recoverStuckSending(timeoutMs?: number): Promise<number> {
    const effectiveTimeout = timeoutMs ?? this.sendingTimeoutMs;
    const threshold = new Date(Date.now() - effectiveTimeout);

    // Find stuck records
    const stuckRecords = await prisma.emailDeliveryLog.findMany({
      where: {
        status: EmailDeliveryStatus.Sending,
        lastAttemptAt: { lte: threshold },
      },
      take: 50,
      select: { id: true, retryCount: true },
    });

    let recovered = 0;
    for (const record of stuckRecords) {
      const nextRetryCount = record.retryCount + 1;
      let nextAttemptAt: Date | null = null;
      if (nextRetryCount === 1) {
        nextAttemptAt = new Date(Date.now() + 5 * 60 * 1000);
      } else if (nextRetryCount === 2) {
        nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000);
      } else if (nextRetryCount === 3) {
        nextAttemptAt = new Date(Date.now() + 45 * 60 * 1000);
      }

      // Reclaim atomically
      const res = await prisma.emailDeliveryLog.updateMany({
        where: {
          id: record.id,
          status: EmailDeliveryStatus.Sending,
          lastAttemptAt: { lte: threshold },
        },
        data: {
          status: EmailDeliveryStatus.Failed,
          errorMessage: `Abandoned in Sending state for > ${effectiveTimeout}ms. Reclaimed by scheduler.`,
          retryCount: nextRetryCount,
          nextAttemptAt,
        },
      });

      if (res.count > 0) {
        recovered++;
      }
    }

    return recovered;
  }
}
