import prisma from '../../config/prisma';
import { DigestService } from '../../services/digest.service';
import { EmailService } from '../../services/email.service';

/**
 * S2-27: Scheduled Hiring Report Digest
 *
 * Sends a weekly executive hiring metrics summary to all active Managers.
 * Designed to be triggered by a Monday 08:00 cron, but can also be called
 * directly for testing or manual invocation.
 *
 * Idempotency: each email is keyed as HIRING_DIGEST:<managerId>:<YYYY-MM-DD>
 * so repeated invocations within the same day are safe.
 */

export interface ProcessHiringDigestResult {
  managersNotified: number;
  errors: number;
}

export async function processHiringDigest(
  referenceDate: Date = new Date()
): Promise<ProcessHiringDigestResult> {
  const managers = await DigestService.getManagerRecipients();

  if (managers.length === 0) {
    console.log('[HiringDigestJob] No active managers found; skipping digest.');
    return { managersNotified: 0, errors: 0 };
  }

  // Build shared digest metrics once for all managers
  const digest = await DigestService.buildDigestPayload({ referenceDate });

  // Date key for idempotency (YYYY-MM-DD in UTC)
  const dateKey = referenceDate.toISOString().slice(0, 10);

  let managersNotified = 0;
  let errors = 0;

  for (const manager of managers) {
    try {
      await EmailService.sendHiringReportDigest(prisma, {
        recipient:           manager.email,
        managerId:           manager.id,
        managerName:         manager.name,
        dateKey,
        openPositionsCount:  digest.openPositionsCount,
        inProgressCount:     digest.inProgressApplicationsCount,
        interviewsCount:     digest.upcomingInterviewsCount,
        pendingOffersCount:  digest.pendingOffersCount,
        agingCount:          digest.agingApplicationsCount,
        dashboardUrl:        `${process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'}/manager/dashboard`,
      });
      managersNotified++;
    } catch (err) {
      console.error(`[HiringDigestJob] Failed to enqueue digest for manager ${manager.id}:`, err);
      errors++;
    }
  }

  console.log(
    `[HiringDigestJob] Digest enqueued for ${managersNotified}/${managers.length} managers (${errors} errors).`
  );

  return { managersNotified, errors };
}
