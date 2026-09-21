import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import {
  Role,
  PositionStatus,
  ApplicationStatus,
  InterviewStatus,
  InvitationStatus,
  NotificationType,
  NotificationChannel
} from '@prisma/client';
import { startScheduler, stopScheduler, isSchedulerRunning } from '../scheduler';
import { processInterviewReminders } from '../scheduler/jobs/interview-reminder.job';
import { InterviewService } from '../services/interview.service';
import { DigestService } from '../services/digest.service';

async function runBatch3bReminderTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run tests in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 2 BATCH 3B — SCHEDULER & INTERVIEW REMINDERS TESTS');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  const testEmails = [
    'manager.batch3b@altrium.com',
    'interviewer.batch3b@altrium.com',
    'inactive.interviewer.batch3b@altrium.com'
  ];

  async function cleanupBatch3bData() {
    const users = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true }
    });
    const userIds = users.map((u) => u.id);

    const positions = await prisma.position.findMany({
      where: {
        OR: [
          { createdById: { in: userIds } },
          { title: { startsWith: 'Batch 3B' } }
        ]
      },
      select: { id: true }
    });
    const positionIds = positions.map((p) => p.id);

    const candidates = await prisma.candidate.findMany({
      where: { email: { startsWith: 'candidate.batch3b.' } },
      select: { id: true }
    });
    const candidateIds = candidates.map((c) => c.id);

    const applications = await prisma.application.findMany({
      where: {
        OR: [
          { positionId: { in: positionIds } },
          { candidateId: { in: candidateIds } }
        ]
      },
      select: { id: true }
    });
    const appIds = applications.map((a) => a.id);

    const interviews = await prisma.interview.findMany({
      where: { applicationId: { in: appIds } },
      select: { id: true }
    });
    const interviewIds = interviews.map((i) => i.id);

    await prisma.notification.deleteMany({
      where: {
        OR: [
          { recipientId: { in: userIds } },
          { interviewId: { in: interviewIds } },
          { applicationId: { in: appIds } }
        ]
      }
    });

    await prisma.interviewerAssignment.deleteMany({
      where: {
        OR: [
          { interviewId: { in: interviewIds } },
          { interviewerId: { in: userIds } }
        ]
      }
    });

    await prisma.feedback.deleteMany({
      where: {
        OR: [
          { interviewId: { in: interviewIds } },
          { interviewerId: { in: userIds } }
        ]
      }
    });

    await prisma.interview.deleteMany({
      where: { id: { in: interviewIds } }
    });

    await prisma.application.deleteMany({
      where: { id: { in: appIds } }
    });

    if (candidateIds.length > 0) {
      await prisma.candidate.deleteMany({
        where: { id: { in: candidateIds } }
      });
    }

    await prisma.stage.deleteMany({
      where: { positionId: { in: positionIds } }
    });

    await prisma.position.deleteMany({
      where: { id: { in: positionIds } }
    });

    await prisma.auditLog.deleteMany({
      where: { actorId: { in: userIds } }
    });

    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    });
  }

  try {
    // Clean any prior run residue
    await cleanupBatch3bData();

    // ── B3-01: Scheduler starts successfully ─────────────────────────────────
    startScheduler();
    assert(isSchedulerRunning() === true, 'B3-01: Scheduler starts successfully');
    // Start again to verify idempotency / PM2 safety
    startScheduler();
    assert(isSchedulerRunning() === true, 'B3-01b: Scheduler start is idempotent');

    // ── Setup Users ──────────────────────────────────────────────────────────
    const manager = await prisma.user.create({
      data: {
        name: 'Batch3B Manager',
        email: 'manager.batch3b@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.Manager,
        isActive: true
      }
    });

    const activeInterviewer = await prisma.user.create({
      data: {
        name: 'Batch3B Active Interviewer',
        email: 'interviewer.batch3b@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.TeamLead,
        isActive: true
      }
    });

    const inactiveInterviewer = await prisma.user.create({
      data: {
        name: 'Batch3B Inactive Interviewer',
        email: 'inactive.interviewer.batch3b@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.TeamLead,
        isActive: false
      }
    });

    // ── Setup Position & Stage & Candidate & Applications ────────────────────
    const position = await prisma.position.create({
      data: {
        title: 'Batch 3B Software Architect',
        department: 'Engineering',
        description: 'Test position for Batch 3B',
        status: PositionStatus.Open,
        createdById: manager.id
      }
    });

    const stage = await prisma.stage.create({
      data: {
        name: 'Technical Architecture Round',
        sequenceOrder: 1,
        positionId: position.id
      }
    });

    const candidate = await prisma.candidate.create({
      data: {
        name: 'Batch3B Candidate',
        email: `candidate.batch3b.${Date.now()}@test.com`
      }
    });

    const app1 = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        positionId: position.id,
        currentStageId: stage.id,
        status: ApplicationStatus.InProgress
      }
    });

    const now = new Date();
    // 24 hours ahead
    const scheduledAt24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // 10 hours ahead (outside 23h-25h window)
    const scheduledAt10h = new Date(now.getTime() + 10 * 60 * 60 * 1000);
    // 48 hours ahead (outside 23h-25h window)
    const scheduledAt48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // ── Create Interviews for Scenario Testing ────────────────────────────────
    // Interview 1: Eligible, 24h away, active interviewer
    const interview1 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 2: Outside window (10h ahead)
    const interview2 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt10h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 3: Outside window (48h ahead)
    const interview3 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt48h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 4: Cancelled (in 24h window)
    const interview4 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Cancelled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 5: Completed (in 24h window)
    const interview5 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Completed,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 6: Declined invitation (in 24h window)
    const interview6 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Declined,
            declineReason: 'Unavailable'
          }
        }
      }
    });

    // Interview 7: Inactive interviewer (in 24h window)
    const interview7 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: inactiveInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // Interview 8: Second interview on the same application (in 24h window)
    const interview8 = await prisma.interview.create({
      data: {
        applicationId: app1.id,
        stageId: stage.id,
        scheduledAt: scheduledAt24h,
        durationMinutes: 60,
        status: InterviewStatus.Scheduled,
        createdById: manager.id,
        assignments: {
          create: {
            interviewerId: activeInterviewer.id,
            invitationStatus: InvitationStatus.Accepted
          }
        }
      }
    });

    // ── Execute reminder processor ───────────────────────────────────────────
    const result = await processInterviewReminders(now);

    // ── B3-02 & B3-04: Only eligible interviews selected & reminder created ───
    // Interviews 1 and 8 are eligible
    assert(result.remindersCreated === 2, 'B3-02: Only eligible interviews are selected for reminders');

    // ── B3-03: Interviews outside window are ignored ──────────────────────────
    const notifOutsideWindow = await prisma.notification.findFirst({
      where: {
        interviewId: { in: [interview2.id, interview3.id] }
      }
    });
    assert(notifOutsideWindow === null, 'B3-03: Interviews outside reminder window are ignored');

    // ── B3-05: Reminder contains interviewId ──────────────────────────────────
    const notif1 = await prisma.notification.findFirst({
      where: { interviewId: interview1.id }
    });
    assert(
      notif1 !== null && notif1.interviewId === interview1.id,
      'B3-05: Reminder contains interviewId'
    );

    // ── B3-06: Reminder uses FeedbackReminder type and InApp channel ──────────
    assert(
      notif1 !== null &&
      notif1.type === NotificationType.FeedbackReminder &&
      notif1.channel === NotificationChannel.InApp,
      'B3-06: Reminder uses FeedbackReminder type and InApp channel'
    );

    // ── B3-07: Duplicate reminder is not created (Idempotency) ────────────────
    const runAgainResult = await processInterviewReminders(now);
    assert(runAgainResult.remindersCreated === 0, 'B3-07: Duplicate reminder is not created (Idempotent)');

    // ── B3-08: Multiple interviews for same application receive independent reminders
    const notif8 = await prisma.notification.findFirst({
      where: { interviewId: interview8.id }
    });
    assert(
      notif8 !== null && notif8.interviewId === interview8.id,
      'B3-08: Multiple interviews for the same application receive independent reminders'
    );

    // ── B3-09: Cancelled / completed / declined / inactive cases ignored ──────
    const invalidNotifs = await prisma.notification.findMany({
      where: {
        interviewId: { in: [interview4.id, interview5.id, interview6.id, interview7.id] }
      }
    });
    assert(
      invalidNotifs.length === 0,
      'B3-09: Cancelled/completed/declined/inactive cases do not generate reminders'
    );

    // ── B3-10: Rescheduling invalidates previous FeedbackReminder (Option B) ───
    // Check initial reminder exists for interview1
    const beforeRescheduleNotif = await prisma.notification.findFirst({
      where: { interviewId: interview1.id, type: NotificationType.FeedbackReminder }
    });
    assert(beforeRescheduleNotif !== null, 'B3-10a: Reminder exists before rescheduling');

    // Reschedule interview1 to 30 hours ahead
    const rescheduledTime = new Date(now.getTime() + 30 * 60 * 60 * 1000);
    await InterviewService.updateInterview(manager.id, interview1.id, {
      scheduledAt: rescheduledTime
    });

    // Verify previous FeedbackReminder was deleted/invalidated
    const afterRescheduleNotif = await prisma.notification.findFirst({
      where: { interviewId: interview1.id, type: NotificationType.FeedbackReminder }
    });
    assert(afterRescheduleNotif === null, 'B3-10b: Rescheduling invalidates previous FeedbackReminder');

    // Process reminders at referenceDate = now + 6 hours (so rescheduled interview at +30h is now +24h away)
    const newRefDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const rescheduleReminderResult = await processInterviewReminders(newRefDate);
    const newReminder = await prisma.notification.findFirst({
      where: { interviewId: interview1.id, type: NotificationType.FeedbackReminder }
    });
    assert(
      rescheduleReminderResult.remindersCreated >= 1 && newReminder !== null,
      'B3-10c: Rescheduling permits new reminder based on new scheduledAt time'
    );

    // ── B3-11: DigestService returns Manager recipients correctly ─────────────
    const managers = await DigestService.getManagerRecipients();
    assert(
      managers.length > 0 && managers.some((m) => m.email === manager.email && m.role === Role.Manager),
      'B3-11: DigestService returns Manager recipients correctly'
    );

    // ── B3-12: DigestService builds expected aggregate payload ────────────────
    const digestPayload = await DigestService.buildDigestPayload({ referenceDate: now });
    assert(
      typeof digestPayload.openPositionsCount === 'number' &&
      typeof digestPayload.inProgressApplicationsCount === 'number' &&
      typeof digestPayload.upcomingInterviewsCount === 'number' &&
      typeof digestPayload.pendingOffersCount === 'number' &&
      Array.isArray(digestPayload.summary.openPositions) &&
      digestPayload.generatedAt instanceof Date,
      'B3-12: DigestService builds expected aggregate payload'
    );

    // Final cleanup of test data
    await cleanupBatch3bData();
  } finally {
    stopScheduler();
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`BATCH 3B TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch3bReminderTests().catch((err) => {
  console.error('Fatal error during Batch 3B test run:', err);
  process.exit(1);
});
