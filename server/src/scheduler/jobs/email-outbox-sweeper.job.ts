import { EmailOutboxService } from '../../services/email/email-outbox.service';

/**
 * S2-47: Email Delivery Logging / Failure Handling
 *
 * Background email outbox sweeper — runs on a cron schedule to:
 * 1. Recover records stuck in the "Sending" state (orphaned by crashes).
 * 2. Retry transient-failed records whose backoff window has elapsed.
 * 3. Process any Pending records that were missed by the immediate dispatcher.
 *
 * This is the durability backbone of the outbox pattern: even if the process
 * crashes mid-send, all emails will eventually be retried up to the backoff
 * limit without duplication (the provider adapter uses idempotency keys).
 */

export interface SweepResult {
  recovered: number;
  processed: number;
}

export async function processEmailOutboxSweep(): Promise<SweepResult> {
  // 1. Recover orphaned Sending records first
  const recovered = await EmailOutboxService.recoverStuckSending();

  if (recovered > 0) {
    console.log(`[EmailOutboxSweeper] Recovered ${recovered} stuck records back to Failed.`);
  }

  // 2. Process pending and retryable failed records
  const processed = await EmailOutboxService.sweepPendingAndRetryable(50);

  if (processed > 0) {
    console.log(`[EmailOutboxSweeper] Processed ${processed} outbox records.`);
  }

  return { recovered, processed };
}
