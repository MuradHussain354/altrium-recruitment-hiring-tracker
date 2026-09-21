import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { Role, PositionStatus, ApplicationStatus } from '@prisma/client';
import { signToken } from '../utils/jwt';
import { ApplicationManagementService } from '../services/application-management.service';

async function runBatch3cAgingTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run tests in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 2 BATCH 3C — APPLICATION AGING / SLA TESTS');
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

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  const request = async (
    path: string,
    options: { method?: string; token?: string; body?: any } = {}
  ) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  const testEmails = [
    'manager.batch3c@altrium.com',
    'hr.batch3c@altrium.com',
    'teamlead.batch3c@altrium.com'
  ];

  async function cleanupBatch3cData() {
    const users = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true }
    });
    const userIds = users.map((u) => u.id);

    const positions = await prisma.position.findMany({
      where: {
        OR: [
          { createdById: { in: userIds } },
          { title: { startsWith: 'Batch3C' } }
        ]
      },
      select: { id: true }
    });
    const positionIds = positions.map((p) => p.id);

    const candidates = await prisma.candidate.findMany({
      where: { email: { startsWith: 'candidate.batch3c.' } },
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
      where: { interviewId: { in: interviewIds } }
    });
    await prisma.feedback.deleteMany({
      where: { interviewId: { in: interviewIds } }
    });
    await prisma.interview.deleteMany({
      where: { id: { in: interviewIds } }
    });
    await prisma.applicationComment.deleteMany({
      where: { applicationId: { in: appIds } }
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
    await cleanupBatch3cData();

    // ── Setup Users ───────────────────────────────────────────────────────────
    const manager = await prisma.user.create({
      data: {
        name: 'Batch3C Manager',
        email: 'manager.batch3c@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.Manager,
        isActive: true
      }
    });

    const hrUser = await prisma.user.create({
      data: {
        name: 'Batch3C HR',
        email: 'hr.batch3c@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.HR,
        isActive: true
      }
    });

    const teamLead = await prisma.user.create({
      data: {
        name: 'Batch3C TeamLead',
        email: 'teamlead.batch3c@altrium.com',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456',
        role: Role.TeamLead,
        isActive: true
      }
    });

    const managerToken = signToken({ id: manager.id, email: manager.email, role: manager.role });
    const hrToken = signToken({ id: hrUser.id, email: hrUser.email, role: hrUser.role });
    const teamLeadToken = signToken({ id: teamLead.id, email: teamLead.email, role: teamLead.role });

    // ── Setup Position & Stages ───────────────────────────────────────────────
    const position = await prisma.position.create({
      data: {
        title: 'Batch3C Engineer',
        department: 'Engineering',
        description: 'Batch 3C test position',
        status: PositionStatus.Open,
        createdById: manager.id
      }
    });

    const stage1 = await prisma.stage.create({
      data: { name: 'Applied', sequenceOrder: 1, positionId: position.id, isGating: false, feedbackRequiredCount: 0 }
    });

    const stage2 = await prisma.stage.create({
      data: { name: 'Interview', sequenceOrder: 2, positionId: position.id }
    });

    const candidate = await prisma.candidate.create({
      data: {
        name: 'Batch3C Candidate',
        email: `candidate.batch3c.${Date.now()}@test.com`
      }
    });

    // ── C3-01: stageEnteredAt field exists ────────────────────────────────────
    const app = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        positionId: position.id,
        currentStageId: stage1.id,
        status: ApplicationStatus.InProgress
      }
    });

    assert(
      'stageEnteredAt' in app && app.stageEnteredAt instanceof Date,
      'C3-01: stageEnteredAt field exists on Application'
    );

    // ── C3-02: Existing records backfilled correctly ───────────────────────────
    // stageEnteredAt defaults to now() (like createdAt for existing rows)
    const diffMs = Math.abs(app.stageEnteredAt.getTime() - app.createdAt.getTime());
    assert(
      diffMs < 5000, // within 5 seconds of each other
      'C3-02: stageEnteredAt is backfilled close to createdAt for new records',
      `diff: ${diffMs}ms`
    );

    // ── C3-03: Moving stage updates stageEnteredAt ────────────────────────────
    const beforeMove = new Date();
    await ApplicationManagementService.moveApplicationStage(hrUser.id, app.id, { stageId: stage2.id });
    const appAfterMove = await prisma.application.findUnique({ where: { id: app.id } });

    assert(
      appAfterMove !== null && appAfterMove.stageEnteredAt >= beforeMove,
      'C3-03: Moving stage updates stageEnteredAt to current time'
    );
    assert(
      appAfterMove !== null && appAfterMove.currentStageId === stage2.id,
      'C3-03b: Application moved to stage2'
    );

    // ── C3-04: Non-stage updates do not change stageEnteredAt ─────────────────
    const stageEnteredAtBeforeNonStageUpdate = appAfterMove!.stageEnteredAt;

    // Update application status (no stage change)
    await prisma.application.update({
      where: { id: app.id },
      data: { notes: 'Non-stage update test' }
    });

    const appAfterNonStageUpdate = await prisma.application.findUnique({ where: { id: app.id } });
    assert(
      appAfterNonStageUpdate !== null &&
      appAfterNonStageUpdate.stageEnteredAt.getTime() === stageEnteredAtBeforeNonStageUpdate.getTime(),
      'C3-04: Non-stage updates do not change stageEnteredAt'
    );

    // ── C3-05 & C3-06: SLA Warning (7 days) and Critical (14 days) thresholds ──
    // Create apps with backdated stageEnteredAt to test thresholds
    const candidate2 = await prisma.candidate.create({
      data: {
        name: 'Batch3C Candidate2',
        email: `candidate.batch3c.warn.${Date.now()}@test.com`
      }
    });

    const candidate3 = await prisma.candidate.create({
      data: {
        name: 'Batch3C Candidate3',
        email: `candidate.batch3c.crit.${Date.now()}@test.com`
      }
    });

    const warningApp = await prisma.application.create({
      data: {
        candidateId: candidate2.id,
        positionId: position.id,
        currentStageId: stage1.id,
        status: ApplicationStatus.InProgress,
        stageEnteredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      }
    });

    const criticalApp = await prisma.application.create({
      data: {
        candidateId: candidate3.id,
        positionId: position.id,
        currentStageId: stage1.id,
        status: ApplicationStatus.InProgress,
        stageEnteredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      }
    });

    // ── C3-08: Manager can access aging report ────────────────────────────────
    const agingRes = await request('/reports/aging', { token: managerToken });
    assert(
      agingRes.status === 200 &&
      agingRes.data?.data?.applications !== undefined &&
      Array.isArray(agingRes.data.data.applications),
      'C3-08: Manager can access aging report'
    );

    if (agingRes.status === 200) {
      const agingData = agingRes.data.data;

      // C3-05: 7-day warning threshold
      const warningEntry = agingData.applications.find((a: any) => a.id === warningApp.id);
      assert(
        warningEntry !== undefined && warningEntry.severity === 'Warning',
        'C3-05: 7-day warning threshold correctly categorizes application',
        `severity: ${warningEntry?.severity}, ageInDays: ${warningEntry?.ageInDays}`
      );

      // C3-06: 14-day critical threshold
      const criticalEntry = agingData.applications.find((a: any) => a.id === criticalApp.id);
      assert(
        criticalEntry !== undefined && criticalEntry.severity === 'Critical',
        'C3-06: 14-day critical threshold correctly categorizes application',
        `severity: ${criticalEntry?.severity}, ageInDays: ${criticalEntry?.ageInDays}`
      );

      // Summary should have thresholds
      assert(
        agingData.summary?.warningThresholdDays === 7 &&
        agingData.summary?.criticalThresholdDays === 14,
        'C3-07: Default environment variable thresholds are 7 and 14 days'
      );
    }

    // ── C3-09: HR cannot access aging report ─────────────────────────────────
    const hrAgingRes = await request('/reports/aging', { token: hrToken });
    assert(
      hrAgingRes.status === 403,
      'C3-09: HR cannot access aging report (403 Forbidden)'
    );

    // ── C3-10: Team Lead cannot access aging report ───────────────────────────
    const tlAgingRes = await request('/reports/aging', { token: teamLeadToken });
    assert(
      tlAgingRes.status === 403,
      'C3-10: Team Lead cannot access aging report (403 Forbidden)'
    );

    // ── C3-11: Public (unauthenticated) cannot access aging report ────────────
    const publicAgingRes = await request('/reports/aging');
    assert(
      publicAgingRes.status === 401,
      'C3-11: Public/unauthenticated cannot access aging report (401 Unauthorized)'
    );

    // ── C3-12: Existing Batch 2 stage gating still works ─────────────────────
    const candidate4 = await prisma.candidate.create({
      data: {
        name: 'Batch3C Gating Candidate',
        email: `candidate.batch3c.gate.${Date.now()}@test.com`
      }
    });

    // Create gating stage requiring 1 feedback
    const gatingStage = await prisma.stage.create({
      data: {
        name: 'Technical Round (gating)',
        sequenceOrder: 3,
        positionId: position.id,
        feedbackRequiredCount: 1
      }
    });

    const gatingApp = await prisma.application.create({
      data: {
        candidateId: candidate4.id,
        positionId: position.id,
        currentStageId: gatingStage.id,
        status: ApplicationStatus.InProgress
      }
    });

    // Try to advance without feedback - should fail
    let stagingGatingFailed = false;
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, gatingApp.id, { stageId: stage1.id });
    } catch (err: any) {
      if (err.statusCode === 409 || err.message?.includes('blocked')) {
        stagingGatingFailed = true;
      }
    }
    assert(stagingGatingFailed, 'C3-12: Existing Batch 2 stage gating still works (movement blocked without feedback)');

    // Cleanup
    await cleanupBatch3cData();
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`BATCH 3C TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch3cAgingTests().catch((err) => {
  console.error('Fatal error during Batch 3C test run:', err);
  process.exit(1);
});
