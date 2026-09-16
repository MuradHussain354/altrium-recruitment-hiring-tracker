import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { ApplicationStatus, PositionStatus } from '@prisma/client';

async function runHttpContractTests() {
  console.log('======================================================================');
  console.log('STARTING SPRINT 2 - BATCH 1A HTTP ENDPOINT CONTRACT TESTS');
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

  // Setup mock store
  const mockStore = {
    candidates: new Map<string, any>(),
    applications: new Map<string, any>(),
    jobAlerts: new Map<string, any>(),
    positions: new Map<string, any>(),
    stages: new Map<string, any>()
  };

  // findFirst mock: enforces both id AND nested candidate.email in WHERE clause
  (prisma.application as any).findFirst = async ({ where }: any) => {
    const appRecord = where.id ? mockStore.applications.get(where.id) : null;
    if (!appRecord) return null;
    // Enforce nested candidate.email filter if present
    if (where.candidate?.email) {
      const cand = mockStore.candidates.get(appRecord.candidateId);
      if (!cand || cand.email.toLowerCase() !== where.candidate.email.toLowerCase()) return null;
    }
    return {
      ...appRecord,
      candidate: mockStore.candidates.get(appRecord.candidateId),
      position: mockStore.positions.get(appRecord.positionId),
      currentStage: mockStore.stages.get(appRecord.currentStageId)
    };
  };

  (prisma.jobAlertSubscription as any).findFirst = async ({ where }: any) => {
    for (const sub of mockStore.jobAlerts.values()) {
      const emailMatch = sub.email === where.email;
      const deptMatch = where.department === undefined || sub.department === where.department;
      const keyMatch = where.keyword === undefined || sub.keyword === where.keyword;
      const activeMatch = where.isActive === undefined || sub.isActive === where.isActive;
      if (emailMatch && deptMatch && keyMatch && activeMatch) return sub;
    }
    return null;
  };

  (prisma.jobAlertSubscription as any).create = async ({ data }: any) => {
    const sub = {
      id: crypto.randomUUID(),
      ...data,
      unsubscribeToken: data.unsubscribeToken || crypto.randomUUID(),
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: new Date()
    };
    mockStore.jobAlerts.set(sub.id, sub);
    return sub;
  };

  (prisma.jobAlertSubscription as any).findUnique = async ({ where }: any) => {
    if (where.unsubscribeToken) {
      for (const sub of mockStore.jobAlerts.values()) {
        if (sub.unsubscribeToken === where.unsubscribeToken) return sub;
      }
    }
    return null;
  };

  (prisma.jobAlertSubscription as any).update = async ({ where, data }: any) => {
    const sub = mockStore.jobAlerts.get(where.id);
    if (!sub) throw new Error('Not found');
    Object.assign(sub, data);
    return sub;
  };

  // Seed sample data
  const testAppId = crypto.randomUUID();
  const testCandId = crypto.randomUUID();
  const testPosId = crypto.randomUUID();
  const testStgId = crypto.randomUUID();

  mockStore.candidates.set(testCandId, {
    id: testCandId,
    name: 'Dana Scully',
    email: 'dana.scully@altrium.com'
  });
  mockStore.positions.set(testPosId, {
    id: testPosId,
    title: 'Lead Forensic Investigator',
    department: 'Operations',
    status: PositionStatus.Open
  });
  mockStore.stages.set(testStgId, {
    id: testStgId,
    name: 'Panel Interview',
    sequenceOrder: 2
  });
  mockStore.applications.set(testAppId, {
    id: testAppId,
    candidateId: testCandId,
    positionId: testPosId,
    currentStageId: testStgId,
    status: ApplicationStatus.InProgress,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  try {
    // 1. POST /public/applications/track - Valid Request
    const trackRes = await fetch(`${baseUrl}/public/applications/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Dana.Scully@Altrium.com',
        referenceId: testAppId
      })
    });
    const trackBody = await trackRes.json() as any;
    assert(
      trackRes.status === 200 &&
        trackBody.data.referenceId === testAppId &&
        trackBody.data.positionTitle === 'Lead Forensic Investigator' &&
        trackBody.data.department === 'Operations' &&
        trackBody.data.currentStageName === 'Panel Interview' &&
        trackBody.data.currentStageSequenceOrder === 2,
      'HTTP 1. POST /public/applications/track returns 200 with candidate-safe payload'
    );

    // 2. POST /public/applications/track - Mismatched Email (Generic 404)
    const track404Res = await fetch(`${baseUrl}/public/applications/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fox.mulder@altrium.com',
        referenceId: testAppId
      })
    });
    const track404Body = await track404Res.json() as any;
    assert(
      track404Res.status === 404 &&
        track404Body.message === 'Application not found with the provided details.',
      'HTTP 2. POST /public/applications/track returns 404 with generic safe message'
    );

    // 3. POST /public/applications/track - Invalid Validation (400)
    const track400Res = await fetch(`${baseUrl}/public/applications/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        referenceId: 'not-a-uuid'
      })
    });
    assert(track400Res.status === 400, 'HTTP 3. POST /public/applications/track returns 400 on invalid payload');

    // 4. POST /public/job-alerts - Create Subscription (201)
    const alertRes = await fetch(`${baseUrl}/public/job-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Subscriber@Example.com',
        department: 'Operations',
        keyword: 'Forensic'
      })
    });
    const alertBody = await alertRes.json() as any;
    assert(
      alertRes.status === 201 &&
        alertBody.data.email === 'subscriber@example.com' &&
        alertBody.data.department === 'Operations' &&
        alertBody.data.keyword === 'Forensic' &&
        alertBody.data.isActive === true &&
        !alertBody.data.unsubscribeToken,
      'HTTP 4. POST /public/job-alerts returns 201 with safe confirmation (token concealed)'
    );

    // 5. POST /public/job-alerts/unsubscribe - Valid Unsubscribe (200, no email exposed)
    const subRecord = mockStore.jobAlerts.get(alertBody.data.id);
    const unsubsRes = await fetch(`${baseUrl}/public/job-alerts/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: subRecord.unsubscribeToken
      })
    });
    const unsubsBody = await unsubsRes.json() as any;
    assert(
      unsubsRes.status === 200 &&
        unsubsBody.isActive === false &&
        unsubsBody.message === 'Successfully unsubscribed from job alerts.' &&
        !('email' in unsubsBody),
      'HTTP 5. POST /public/job-alerts/unsubscribe returns 200 and deactivates (email not exposed)'
    );

    // 6. GET /public/job-alerts/unsubscribe/:token is REMOVED (returns 404)
    const getRes = await fetch(`${baseUrl}/public/job-alerts/unsubscribe/${subRecord.unsubscribeToken}`);
    assert(
      getRes.status === 404,
      'HTTP 6. GET /public/job-alerts/unsubscribe/:token returns 404 (GET endpoint removed)'
    );

    // 7. POST /public/job-alerts/unsubscribe - Repeated Unsubscribe (200, idempotent, no email exposed)
    const repeatedRes = await fetch(`${baseUrl}/public/job-alerts/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: subRecord.unsubscribeToken
      })
    });
    const repeatedBody = await repeatedRes.json() as any;
    assert(
      repeatedRes.status === 200 &&
        repeatedBody.isActive === false &&
        repeatedBody.message === 'Subscription is already inactive.' &&
        !('email' in repeatedBody),
      'HTTP 7. POST /public/job-alerts/unsubscribe gracefully handles repeated unsubscribe (no email)'
    );

    // 8. POST /public/job-alerts/unsubscribe - Invalid Token (404)
    const invalidTokenRes = await fetch(`${baseUrl}/public/job-alerts/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'invalid-non-existent-token'
      })
    });
    assert(
      invalidTokenRes.status === 404,
      'HTTP 8. POST /public/job-alerts/unsubscribe rejects invalid token with 404'
    );

    // 9. POST /public/job-alerts/unsubscribe - Reject Token from Query (Body only, 400)
    const queryRes = await fetch(`${baseUrl}/public/job-alerts/unsubscribe?token=${subRecord.unsubscribeToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(
      queryRes.status === 400,
      'HTTP 9. POST /public/job-alerts/unsubscribe rejects token in query string (body only required)'
    );
  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`HTTP TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHttpContractTests();
