import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { Role, RecipientType, NotificationType, NotificationChannel } from '@prisma/client';
import { signToken } from '../utils/jwt';
import { CommentService } from '../services/comment.service';
import { InterviewService } from '../services/interview.service';

async function runBatch3aNotificationTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run tests in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 2 BATCH 3A — NOTIFICATION FOUNDATION VERIFICATION');
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

  // Start ephemeral HTTP server for API verification
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  const request = async (
    path: string,
    options: { method?: string; token?: string; body?: any } = {}
  ) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  try {
    const testEmails = ['user.a.batch3a@altrium.com', 'user.b.batch3a@altrium.com'];

    async function cleanupBatch3aData() {
      const users = await prisma.user.findMany({
        where: { email: { in: testEmails } },
        select: { id: true }
      });
      const userIds = users.map((u) => u.id);

      const positions = await prisma.position.findMany({
        where: {
          OR: [
            { createdById: { in: userIds } },
            { title: 'Mention Engineer' }
          ]
        },
        select: { id: true }
      });
      const positionIds = positions.map((p) => p.id);

      const candidates = await prisma.candidate.findMany({
        where: { email: { startsWith: 'candidate.mention.' } },
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

      // Clean up in reverse FK dependency order
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { recipientId: { in: userIds } },
            { interviewId: { in: interviewIds } },
            { applicationId: { in: appIds } }
          ]
        }
      });

      await prisma.feedbackCriterionScore.deleteMany({
        where: {
          feedback: {
            OR: [
              { interviewId: { in: interviewIds } },
              { interviewerId: { in: userIds } }
            ]
          }
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

      await prisma.interviewerAssignment.deleteMany({
        where: {
          OR: [
            { interviewId: { in: interviewIds } },
            { interviewerId: { in: userIds } }
          ]
        }
      });

      await prisma.interview.deleteMany({
        where: {
          OR: [
            { id: { in: interviewIds } },
            { applicationId: { in: appIds } }
          ]
        }
      });

      await prisma.commentMention.deleteMany({
        where: { userId: { in: userIds } }
      });

      await prisma.applicationComment.deleteMany({
        where: {
          OR: [
            { applicationId: { in: appIds } },
            { authorId: { in: userIds } }
          ]
        }
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

    // Pre-cleanup in case previous runs left artifacts
    await cleanupBatch3aData();

    // ── Setup Test Data ──────────────────────────────────────────────────────
    const userA = await prisma.user.upsert({
      where: { email: 'user.a.batch3a@altrium.com' },
      update: {},
      create: {
        id: 'user-a-batch3a-uuid',
        name: 'User Alpha',
        email: 'user.a.batch3a@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.HR
      }
    });

    const userB = await prisma.user.upsert({
      where: { email: 'user.b.batch3a@altrium.com' },
      update: {},
      create: {
        id: 'user-b-batch3a-uuid',
        name: 'User Beta',
        email: 'user.b.batch3a@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.TeamLead
      }
    });

    const tokenA = signToken({ id: userA.id, email: userA.email, role: userA.role });
    const tokenB = signToken({ id: userB.id, email: userB.email, role: userB.role });

    // ── Create Test Notifications for User A & User B ────────────────────────
    const notifA1 = await prisma.notification.create({
      data: {
        recipientType: RecipientType.User,
        recipientId: userA.id,
        type: NotificationType.InterviewScheduled,
        channel: NotificationChannel.InApp,
        isRead: false
      }
    });

    const notifA2 = await prisma.notification.create({
      data: {
        recipientType: RecipientType.User,
        recipientId: userA.id,
        type: NotificationType.CommentMention,
        channel: NotificationChannel.InApp,
        isRead: false
      }
    });

    const notifA3_read = await prisma.notification.create({
      data: {
        recipientType: RecipientType.User,
        recipientId: userA.id,
        type: NotificationType.FeedbackReminder,
        channel: NotificationChannel.Email,
        isRead: true,
        readAt: new Date()
      }
    });

    const notifB1 = await prisma.notification.create({
      data: {
        recipientType: RecipientType.User,
        recipientId: userB.id,
        type: NotificationType.CommentMention,
        channel: NotificationChannel.InApp,
        isRead: false
      }
    });

    // ── N-01: Unread count returns only notifications belonging to authenticated user ──
    const resA_count1 = await request('/notifications/unread-count', { token: tokenA });
    assert(
      resA_count1.status === 200 &&
      (resA_count1.data?.data?.unreadCount === 2 || resA_count1.data?.unreadCount === 2),
      'N-01: Unread count returns only notifications belonging to authenticated user'
    );

    // ── N-02: Unread count excludes read notifications ───────────────────────
    // User A has 2 unread (notifA1, notifA2) and 1 read (notifA3_read) -> total = 3, unread = 2
    const totalA = await prisma.notification.count({ where: { recipientId: userA.id } });
    const countA = resA_count1.data?.data?.unreadCount ?? resA_count1.data?.unreadCount;
    assert(
      totalA === 3 && countA === 2,
      'N-02: Unread count excludes read notifications'
    );

    // ── N-03: Mark own notification as read succeeds ─────────────────────────
    const resMarkA = await request(`/notifications/${notifA1.id}/read`, {
      method: 'PATCH',
      token: tokenA
    });
    const updatedA1 = await prisma.notification.findUnique({ where: { id: notifA1.id } });
    assert(
      resMarkA.status === 200 &&
      resMarkA.data?.data?.isRead === true &&
      updatedA1?.isRead === true &&
      updatedA1?.readAt !== null,
      'N-03: Mark own notification as read succeeds'
    );

    // After marking 1 read, unread count should be 1
    const resA_count2 = await request('/notifications/unread-count', { token: tokenA });
    assert(
      (resA_count2.data?.data?.unreadCount === 1 || resA_count2.data?.unreadCount === 1),
      'N-03b: Unread count reflects single notification mark-as-read'
    );

    // ── N-04: Marking another user\'s notification as read returns 404/denied ──
    const resForbiddenMark = await request(`/notifications/${notifB1.id}/read`, {
      method: 'PATCH',
      token: tokenA // User A trying to mark User B's notification
    });
    const b1StillUnread = await prisma.notification.findUnique({ where: { id: notifB1.id } });
    assert(
      resForbiddenMark.status === 404 && b1StillUnread?.isRead === false,
      'N-04: Marking another user\'s notification as read returns not-found/denied'
    );

    // ── N-05: Mark-all-as-read only affects the authenticated user\'s notifications ─
    const resMarkAllA = await request('/notifications/read-all', {
      method: 'PATCH',
      token: tokenA
    });
    const aRemainingUnread = await prisma.notification.count({
      where: { recipientId: userA.id, isRead: false }
    });
    const bStillUnreadCount = await prisma.notification.count({
      where: { recipientId: userB.id, isRead: false }
    });
    assert(
      resMarkAllA.status === 200 &&
      aRemainingUnread === 0 &&
      bStillUnreadCount === 1,
      'N-05: Mark-all-as-read only affects the authenticated user\'s notifications'
    );

    // ── N-06: Mark-all-as-read is idempotent ────────────────────────────────
    const resMarkAllA_repeat = await request('/notifications/read-all', {
      method: 'PATCH',
      token: tokenA
    });
    assert(
      resMarkAllA_repeat.status === 200 &&
      (resMarkAllA_repeat.data?.data?.count === 0 || resMarkAllA_repeat.data?.count === 0),
      'N-06: Mark-all-as-read is idempotent'
    );

    // ── N-07 & N-08: @mention creates CommentMention and uses InApp channel ───
    // Setup position and application for comment test
    const testCandidate = await prisma.candidate.create({
      data: {
        name: 'Mention Candidate',
        email: `candidate.mention.${Date.now()}@test.com`
      }
    });

    const testPosition = await prisma.position.create({
      data: {
        title: 'Mention Engineer',
        department: 'Engineering',
        description: 'Test position description for Batch 3A',
        createdById: userA.id
      }
    });

    const testStage = await prisma.stage.create({
      data: {
        positionId: testPosition.id,
        name: 'Technical Round 1',
        sequenceOrder: 1
      }
    });

    const testApplication = await prisma.application.create({
      data: {
        candidateId: testCandidate.id,
        positionId: testPosition.id,
        currentStageId: testStage.id
      }
    });

    // User A adds comment mentioning User Beta (@User Beta)
    await CommentService.addComment(
      userA,
      testApplication.id,
      `Hello @${userB.name} please review this portfolio`
    );

    const mentionNotif = await prisma.notification.findFirst({
      where: {
        applicationId: testApplication.id,
        recipientId: userB.id,
        type: NotificationType.CommentMention
      }
    });

    assert(
      mentionNotif !== null && mentionNotif.type === NotificationType.CommentMention,
      'N-07: @mention creates NotificationType.CommentMention'
    );

    assert(
      mentionNotif !== null && mentionNotif.channel === NotificationChannel.InApp,
      'N-08: @mention notification uses NotificationChannel.InApp'
    );

    // ── N-09: InterviewScheduled notification stores interviewId and uses InApp ─
    const scheduledDate = new Date(Date.now() + 86400000);
    const scheduledInterview = await InterviewService.createInterview(
      userA.id,
      testApplication.id,
      {
        stageId: testStage.id,
        scheduledAt: scheduledDate,
        durationMinutes: 45,
        interviewerIds: [userB.id]
      }
    );

    const interviewNotif = await prisma.notification.findFirst({
      where: {
        recipientId: userB.id,
        type: NotificationType.InterviewScheduled,
        interviewId: scheduledInterview!.id
      }
    });

    assert(
      interviewNotif !== null &&
      interviewNotif.interviewId === scheduledInterview!.id &&
      interviewNotif.channel === NotificationChannel.InApp,
      'N-09: InterviewScheduled notification stores interviewId and uses InApp'
    );

    // ── N-10: Existing notification functionality/regression remains intact ───
    const listRes = await request('/notifications', { token: tokenB });
    assert(
      listRes.status === 200 &&
      Array.isArray(listRes.data?.data) &&
      listRes.data.data.length >= 2,
      'N-10: Existing notification listing functionality remains intact'
    );

    // Clean up all test records
    await cleanupBatch3aData();


  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`BATCH 3A TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch3aNotificationTests().catch((err) => {
  console.error('Fatal error during Batch 3A test run:', err);
  process.exit(1);
});
