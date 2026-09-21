import cron, { ScheduledTask } from 'node-cron';
import { processInterviewReminders } from './jobs/interview-reminder.job';

let interviewReminderTask: ScheduledTask | null = null;
let isStarted = false;

/**
 * Initializes and starts background scheduler jobs.
 * Safe under PM2 reload/restart cycles.
 */
export function startScheduler(): void {
  if (isStarted) {
    return;
  }

  // Schedule interview reminders every 15 minutes
  interviewReminderTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await processInterviewReminders();
    } catch (err) {
      console.error('[Scheduler] Error processing interview reminders:', err);
    }
  });

  isStarted = true;
}

/**
 * Stops all scheduled jobs.
 */
export function stopScheduler(): void {
  if (interviewReminderTask) {
    interviewReminderTask.stop();
    interviewReminderTask = null;
  }
  isStarted = false;
}

export function isSchedulerRunning(): boolean {
  return isStarted;
}

export { processInterviewReminders };
