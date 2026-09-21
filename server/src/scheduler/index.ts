import cron, { ScheduledTask } from 'node-cron';
import { processInterviewReminders } from './jobs/interview-reminder.job';
import { processJobAlerts } from './jobs/job-alert.job';
import { processHiringDigest } from './jobs/hiring-digest.job';
import { processEmailOutboxSweep } from './jobs/email-outbox-sweeper.job';

let interviewReminderTask: ScheduledTask | null = null;
let jobAlertTask:          ScheduledTask | null = null;
let hiringDigestTask:      ScheduledTask | null = null;
let emailOutboxSweeperTask: ScheduledTask | null = null;

let isStarted = false;

/**
 * Initializes and starts background scheduler jobs.
 * Safe under PM2 reload/restart cycles (idempotent guard).
 */
export function startScheduler(): void {
  if (isStarted) {
    return;
  }

  // ── Interview feedback reminders (every 15 minutes) ─────────────────────────
  interviewReminderTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await processInterviewReminders();
    } catch (err) {
      console.error('[Scheduler] Error processing interview reminders:', err);
    }
  });

  // ── S2-07: Job alert emails (every 15 minutes) ───────────────────────────────
  // Overlapping window with cron cadence ensures no newly-opened position is missed.
  jobAlertTask = cron.schedule('*/15 * * * *', async () => {
    try {
      const result = await processJobAlerts();
      if (result.alertsEnqueued > 0) {
        console.log(
          `[Scheduler] Job alerts: checked ${result.positionsChecked} positions, enqueued ${result.alertsEnqueued} alerts.`
        );
      }
    } catch (err) {
      console.error('[Scheduler] Error processing job alerts:', err);
    }
  });

  // ── S2-27: Weekly hiring report digest (Monday 08:00, APP_TIMEZONE) ─────────
  // Timezone defaults to Asia/Colombo per the approved design; only an explicit
  // APP_TIMEZONE override changes this (including an explicit "UTC").
  const digestTimezone = process.env.APP_TIMEZONE || 'Asia/Colombo';
  hiringDigestTask = cron.schedule(
    '0 8 * * 1',
    async () => {
      try {
        const result = await processHiringDigest();
        console.log(
          `[Scheduler] Hiring digest: notified ${result.managersNotified} managers (${result.errors} errors).`
        );
      } catch (err) {
        console.error('[Scheduler] Error processing hiring digest:', err);
      }
    },
    { timezone: digestTimezone }
  );

  // ── S2-47: Email outbox sweeper (every 1 minute) ─────────────────────────────
  // Recovers stuck Sending records and retries transient-failed emails.
  emailOutboxSweeperTask = cron.schedule('* * * * *', async () => {
    try {
      await processEmailOutboxSweep();
    } catch (err) {
      console.error('[Scheduler] Error during email outbox sweep:', err);
    }
  });

  isStarted = true;
  console.log('[Scheduler] All background jobs started.');
}

/**
 * Stops all scheduled jobs gracefully.
 */
export function stopScheduler(): void {
  interviewReminderTask?.stop();
  jobAlertTask?.stop();
  hiringDigestTask?.stop();
  emailOutboxSweeperTask?.stop();

  interviewReminderTask  = null;
  jobAlertTask           = null;
  hiringDigestTask       = null;
  emailOutboxSweeperTask = null;

  isStarted = false;
}

export function isSchedulerRunning(): boolean {
  return isStarted;
}

// Named re-exports for direct test invocation
export {
  processInterviewReminders,
  processJobAlerts,
  processHiringDigest,
  processEmailOutboxSweep,
};
