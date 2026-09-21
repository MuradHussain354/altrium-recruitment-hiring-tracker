import prisma from '../../config/prisma';
import { PositionStatus } from '@prisma/client';
import { EmailService } from '../../services/email.service';

/**
 * S2-07: Notify Me of New Job Openings
 *
 * Runs periodically to dispatch job-alert emails to active subscribers whose
 * department/keyword preferences match recently-opened positions.
 *
 * Idempotency: the EmailOutboxService enforces a unique idempotencyKey per
 * (positionId, subscriptionId) pair, so re-runs are safe.
 *
 * Design notes:
 * - A "new" position is one whose `openedAt` (stamped by PositionService only on
 *   an actual transition INTO Open — see updatePositionStatus/createPosition)
 *   falls within the last processingWindowMs. This is deliberately NOT based on
 *   `updatedAt`, which also changes on ordinary content edits and would cause a
 *   position that has been Open for weeks to look "newly opened" again the next
 *   time someone fixes a typo in its description.
 *   The default 15-min window matches the cron cadence so no opening is missed.
 * - Keyword matching is a case-insensitive substring search against title,
 *   description, requiredSkills (null-safe), and department.
 * - The unsubscribeToken is read from DB at render time by EmailOutboxService so it
 *   is never stored in the outbox payload.
 */

const DEFAULT_WINDOW_MINUTES = 15;

export interface ProcessJobAlertsResult {
  positionsChecked: number;
  alertsEnqueued: number;
}

export async function processJobAlerts(
  referenceDate: Date = new Date(),
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): Promise<ProcessJobAlertsResult> {
  const windowStart = new Date(referenceDate.getTime() - windowMinutes * 60 * 1000);

  // Find positions that actually transitioned to Open within the processing window
  const newlyOpenPositions = await prisma.position.findMany({
    where: {
      status:   PositionStatus.Open,
      openedAt: { gte: windowStart },
    },
    select: { id: true, title: true, department: true, description: true, requiredSkills: true },
  });

  if (newlyOpenPositions.length === 0) {
    return { positionsChecked: 0, alertsEnqueued: 0 };
  }

  // Fetch all active subscribers once
  const activeSubscribers = await prisma.jobAlertSubscription.findMany({
    where: { isActive: true },
    select: { id: true, email: true, department: true, keyword: true },
  });

  let alertsEnqueued = 0;

  for (const position of newlyOpenPositions) {
    for (const subscriber of activeSubscribers) {
      // Department filter: if subscriber specified a department, it must match
      if (subscriber.department) {
        const deptNorm = subscriber.department.toLowerCase();
        if (!position.department.toLowerCase().includes(deptNorm)) {
          continue;
        }
      }

      // Keyword filter: if subscriber specified a keyword, match against
      // title, description, requiredSkills (nullable), or department.
      if (subscriber.keyword) {
        const kw = subscriber.keyword.toLowerCase();
        const matchesTitle          = position.title.toLowerCase().includes(kw);
        const matchesDepartment     = position.department.toLowerCase().includes(kw);
        const matchesDescription    = position.description.toLowerCase().includes(kw);
        const matchesRequiredSkills = (position.requiredSkills ?? '').toLowerCase().includes(kw);
        if (!matchesTitle && !matchesDepartment && !matchesDescription && !matchesRequiredSkills) {
          continue;
        }
      }

      // Enqueue email (idempotent via outbox unique key)
      try {
        await EmailService.sendJobAlert(prisma, {
          recipient:      subscriber.email,
          subscriptionId: subscriber.id,
          positionId:     position.id,
          positionTitle:  position.title,
          department:     position.department,
          jobUrl:         `${process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'}/jobs/${position.id}`,
        });
        alertsEnqueued++;
      } catch (err) {
        console.error(
          `[JobAlertJob] Failed to enqueue alert for subscriber ${subscriber.id} / position ${position.id}:`,
          err
        );
      }
    }
  }

  return { positionsChecked: newlyOpenPositions.length, alertsEnqueued };
}
