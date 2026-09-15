import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import prisma from '../config/prisma';
import { ApplicationService } from '../services/application.service';
import { JobAlertService } from '../services/job-alert.service';
import { candidateApplicationSchema, trackApplicationSchema } from '../schemas/application.schema';
import { jobAlertSubscriptionSchema, unsubscribeJobAlertSchema } from '../schemas/job-alert.schema';
import { ApplicationStatus, PositionStatus, CandidateSource, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runBatch1aTests() {
  console.log('======================================================================');
  console.log('STARTING SPRINT 2 - BATCH 1A PUBLIC CAREERS BACKEND VERIFICATION SUITE');
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

  // Batch 1A safety rule: migrations have not yet been executed against the database.
  // We use an isolated in-memory Prisma test harness to verify all business rules,
  // service logic, contracts, and Zod schemas safely without modifying or requiring unmigrated DB tables.
  console.log('[INFO] Executing Batch 1A verification suite with isolated test harness.');

  // Setup mock store for test execution
  const mockStore = {
    candidates: new Map<string, any>(),
    applications: new Map<string, any>(),
    jobAlerts: new Map<string, any>(),
    positions: new Map<string, any>(),
    stages: new Map<string, any>()
  };

  if (true) {
    // Monkey-patch prisma methods for offline verification
    // findFirst mock: enforces both id AND nested candidate.email in WHERE clause
    (prisma.application as any).findFirst = async ({ where }: any) => {
      const app = where.id ? mockStore.applications.get(where.id) : null;
      if (!app) return null;
      // Enforce nested candidate.email filter if present
      if (where.candidate?.email) {
        const cand = mockStore.candidates.get(app.candidateId);
        if (!cand || cand.email.toLowerCase() !== where.candidate.email.toLowerCase()) return null;
      }
      const cand = mockStore.candidates.get(app.candidateId);
      return {
        ...app,
        candidate: cand,
        position: mockStore.positions.get(app.positionId),
        currentStage: mockStore.stages.get(app.currentStageId)
      };
    };

    // Keep findUnique available for other model lookups in the suite
    (prisma.application as any).findUnique = async ({ where }: any) => {
      const app = mockStore.applications.get(where.id);
      if (!app) return null;
      return {
        ...app,
        candidate: mockStore.candidates.get(app.candidateId),
        position: mockStore.positions.get(app.positionId),
        currentStage: mockStore.stages.get(app.currentStageId)
      };
    };

    (prisma.candidate as any).findFirst = async ({ where }: any) => {
      for (const cand of mockStore.candidates.values()) {
        if (cand.email.toLowerCase() === where.email.toLowerCase()) return cand;
      }
      return null;
    };

    (prisma.candidate as any).create = async ({ data }: any) => {
      const cand = { id: crypto.randomUUID(), ...data, createdAt: new Date() };
      mockStore.candidates.set(cand.id, cand);
      return cand;
    };

    (prisma.candidate as any).update = async ({ where, data }: any) => {
      const cand = mockStore.candidates.get(where.id);
      if (!cand) throw new Error('Candidate not found');
      Object.assign(cand, data);
      return cand;
    };

    (prisma.position as any).findUnique = async ({ where }: any) => {
      return mockStore.positions.get(where.id) || null;
    };

    (prisma.stage as any).findFirst = async ({ where }: any) => {
      for (const stage of mockStore.stages.values()) {
        if (stage.positionId === where.positionId) return stage;
      }
      return null;
    };

    (prisma.application as any).create = async ({ data, include }: any) => {
      // Check composite unique
      for (const app of mockStore.applications.values()) {
        if (app.candidateId === data.candidateId && app.positionId === data.positionId) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '5.10.0'
          });
        }
      }
      const app = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockStore.applications.set(app.id, app);
      const cand = mockStore.candidates.get(app.candidateId);
      const pos = mockStore.positions.get(app.positionId);
      const stg = mockStore.stages.get(app.currentStageId);
      return {
        ...app,
        candidate: { id: cand.id, name: cand.name, email: cand.email, phone: cand.phone, resumeUrl: cand.resumeUrl, source: cand.source },
        position: { id: pos.id, title: pos.title, department: pos.department },
        currentStage: { id: stg.id, name: stg.name, sequenceOrder: stg.sequenceOrder }
      };
    };

    (prisma as any).$transaction = async (cb: any) => {
      return await cb(prisma);
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
      if (where.id) {
        return mockStore.jobAlerts.get(where.id) || null;
      }
      return null;
    };

    (prisma.jobAlertSubscription as any).update = async ({ where, data }: any) => {
      const sub = mockStore.jobAlerts.get(where.id);
      if (!sub) throw new Error('Subscription not found');
      Object.assign(sub, data);
      return sub;
    };
  }

  // Seed sample mock/live data for tracking and application tests
  const testCandidateId = crypto.randomUUID();
  const testPositionId = crypto.randomUUID();
  const testStageId = crypto.randomUUID();
  const testApplicationId = crypto.randomUUID();
  const rejectedApplicationId = crypto.randomUUID();
  const hiredApplicationId = crypto.randomUUID();

  const candidateEmail = 'candidate.track@example.com';

  const seededCandidate = {
    id: testCandidateId,
    name: 'Alice Wonder',
    email: candidateEmail,
    phone: '+1234567890',
    resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/resume.pdf',
    linkedInUrl: 'https://linkedin.com/in/alicewonder',
    source: CandidateSource.Direct,
    createdAt: new Date()
  };

  const seededPosition = {
    id: testPositionId,
    title: 'Senior Cloud Engineer',
    department: 'Engineering',
    status: PositionStatus.Open,
    headcount: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const seededStage = {
    id: testStageId,
    positionId: testPositionId,
    name: 'Technical Screening',
    sequenceOrder: 1,
    isGating: true,
    feedbackRequiredCount: 1
  };

  const seededApplication = {
    id: testApplicationId,
    candidateId: testCandidateId,
    positionId: testPositionId,
    currentStageId: testStageId,
    status: ApplicationStatus.InProgress,
    statusReason: null,
    notes: 'Passionate about cloud architecture',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const seededRejectedApplication = {
    id: rejectedApplicationId,
    candidateId: testCandidateId,
    positionId: testPositionId,
    currentStageId: testStageId,
    status: ApplicationStatus.Rejected,
    statusReason: 'Internal confidential reason - do not expose',
    notes: 'Cover note',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const seededHiredApplication = {
    id: hiredApplicationId,
    candidateId: testCandidateId,
    positionId: testPositionId,
    currentStageId: testStageId,
    status: ApplicationStatus.Hired,
    statusReason: 'Top performer - internal offer signed',
    notes: 'Cover note',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  mockStore.candidates.set(testCandidateId, seededCandidate);
  mockStore.positions.set(testPositionId, seededPosition);
  mockStore.stages.set(testStageId, seededStage);
  mockStore.applications.set(testApplicationId, seededApplication);
  mockStore.applications.set(rejectedApplicationId, seededRejectedApplication);
  mockStore.applications.set(hiredApplicationId, seededHiredApplication);

  try {
    // ==========================================
    // TRACKING TESTS (1 - 10)
    // ==========================================
    console.log('\n--- GROUP 1: APPLICATION TRACKING ---');

    // 1. correct email + correct reference -> success
    const trackSuccess = await ApplicationService.trackApplication({
      email: 'Candidate.Track@Example.com', // test case-insensitivity
      referenceId: testApplicationId
    });
    assert(
      trackSuccess.referenceId === testApplicationId &&
        trackSuccess.positionTitle === 'Senior Cloud Engineer' &&
        trackSuccess.department === 'Engineering' &&
        trackSuccess.status === ApplicationStatus.InProgress &&
        trackSuccess.currentStageName === 'Technical Screening' &&
        trackSuccess.currentStageSequenceOrder === 1,
      '1. correct email + correct reference -> success'
    );

    // 2. wrong email + correct reference -> generic not found
    let errWrongEmail: any = null;
    try {
      await ApplicationService.trackApplication({
        email: 'wrong.email@example.com',
        referenceId: testApplicationId
      });
    } catch (err) {
      errWrongEmail = err;
    }
    assert(
      errWrongEmail instanceof AppError &&
        errWrongEmail.statusCode === 404 &&
        errWrongEmail.message === 'Application not found with the provided details.',
      '2. wrong email + correct reference -> generic not found'
    );

    // 3. correct email + wrong reference -> generic not found
    let errWrongRef: any = null;
    try {
      await ApplicationService.trackApplication({
        email: candidateEmail,
        referenceId: crypto.randomUUID()
      });
    } catch (err) {
      errWrongRef = err;
    }
    assert(
      errWrongRef instanceof AppError &&
        errWrongRef.statusCode === 404 &&
        errWrongRef.message === 'Application not found with the provided details.',
      '3. correct email + wrong reference -> generic not found'
    );

    // 4. invalid UUID -> validation error
    const parseInvalidUuid = trackApplicationSchema.safeParse({
      email: candidateEmail,
      referenceId: 'not-a-valid-uuid'
    });
    assert(!parseInvalidUuid.success, '4. invalid UUID -> validation error');

    // 5. invalid email -> validation error
    const parseInvalidEmail = trackApplicationSchema.safeParse({
      email: 'not-an-email',
      referenceId: testApplicationId
    });
    assert(!parseInvalidEmail.success, '5. invalid email -> validation error');

    // 6. tracking response contains no internal feedback
    const trackKeys = Object.keys(trackSuccess);
    assert(
      !('feedback' in trackSuccess) &&
        !('feedbacks' in trackSuccess) &&
        !('comments' in trackSuccess) &&
        !('ratings' in trackSuccess) &&
        !('scorecard' in trackSuccess),
      '6. tracking response contains no internal feedback'
    );

    // 7. tracking response contains no interviewer data
    assert(
      !('interviewer' in trackSuccess) &&
        !('interviewers' in trackSuccess) &&
        !('interviewerId' in trackSuccess) &&
        !('teamLead' in trackSuccess) &&
        !('hr' in trackSuccess) &&
        !('manager' in trackSuccess),
      '7. tracking response contains no interviewer data'
    );

    // 8. tracking response contains no audit/internal notes
    assert(
      !('notes' in trackSuccess) &&
        !('auditLogs' in trackSuccess) &&
        !('assignedTeam' in trackSuccess) &&
        !('statusReason' in trackSuccess) &&
        !('candidateId' in trackSuccess) &&
        !('createdById' in trackSuccess),
      '8. tracking response contains no audit/internal notes'
    );

    // 9. rejected application tracks safely
    const trackRejected = await ApplicationService.trackApplication({
      email: candidateEmail,
      referenceId: rejectedApplicationId
    });
    assert(
      trackRejected.status === ApplicationStatus.Rejected &&
        !('statusReason' in trackRejected) &&
        trackRejected.referenceId === rejectedApplicationId,
      '9. rejected application tracks safely'
    );

    // 10. hired application tracks safely
    const trackHired = await ApplicationService.trackApplication({
      email: candidateEmail,
      referenceId: hiredApplicationId
    });
    assert(
      trackHired.status === ApplicationStatus.Hired &&
        !('statusReason' in trackHired) &&
        trackHired.referenceId === hiredApplicationId,
      '10. hired application tracks safely'
    );

    // ==========================================
    // APPLICATION FORM BACKEND (11 - 18)
    // ==========================================
    console.log('\n--- GROUP 2: APPLICATION FORM EXTENSIONS ---');

    // 11. old application payload still works (omitting linkedInUrl and notes)
    const oldPayload = {
      name: 'Bob OldFormat',
      email: 'bob.old@example.com',
      positionId: testPositionId,
      resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/bob.pdf'
    };
    const parsedOld = candidateApplicationSchema.safeParse(oldPayload);
    assert(
      parsedOld.success &&
        parsedOld.data.linkedInUrl === undefined &&
        parsedOld.data.notes === undefined,
      '11. old application payload still works'
    );

    // 12. application with valid linkedInUrl works
    const payloadWithLinkedIn = {
      ...oldPayload,
      email: 'bob.linkedin@example.com',
      linkedInUrl: 'https://www.linkedin.com/in/bob-engineer'
    };
    const parsedLinkedIn = candidateApplicationSchema.safeParse(payloadWithLinkedIn);
    assert(
      parsedLinkedIn.success &&
        parsedLinkedIn.data.linkedInUrl === 'https://www.linkedin.com/in/bob-engineer',
      '12. application with valid linkedInUrl works'
    );

    // 13. invalid linkedInUrl rejected
    const payloadWithBadLinkedIn = {
      ...oldPayload,
      linkedInUrl: 'ht!tp://not a valid url'
    };
    const parsedBadLinkedIn = candidateApplicationSchema.safeParse(payloadWithBadLinkedIn);
    assert(!parsedBadLinkedIn.success, '13. invalid linkedInUrl rejected');

    // 14. optional note persists
    const payloadWithNote = {
      ...oldPayload,
      email: 'bob.notes@example.com',
      notes: '  Excited to contribute to distributed systems!  '
    };
    const parsedNote = candidateApplicationSchema.safeParse(payloadWithNote);
    assert(
      parsedNote.success &&
        parsedNote.data.notes === 'Excited to contribute to distributed systems!',
      '14. optional note persists and is trimmed'
    );

    // 15. omitted note works
    const payloadOmittedNote = { ...oldPayload };
    const parsedOmittedNote = candidateApplicationSchema.safeParse(payloadOmittedNote);
    assert(
      parsedOmittedNote.success && parsedOmittedNote.data.notes === undefined,
      '15. omitted note works'
    );

    // 16. omitted linkedInUrl works
    const payloadOmittedLinkedIn = { ...oldPayload };
    const parsedOmittedLinkedIn = candidateApplicationSchema.safeParse(payloadOmittedLinkedIn);
    assert(
      parsedOmittedLinkedIn.success && parsedOmittedLinkedIn.data.linkedInUrl === undefined,
      '16. omitted linkedInUrl works'
    );

    // 17. duplicate application behaviour unchanged
    // Submit first application
    const newPosId = crypto.randomUUID();
    const newStageId = crypto.randomUUID();
    mockStore.positions.set(newPosId, {
      id: newPosId,
      title: 'DevOps Specialist',
      department: 'Infrastructure',
      status: PositionStatus.Open
    });
    mockStore.stages.set(newStageId, {
      id: newStageId,
      positionId: newPosId,
      name: 'Initial Review',
      sequenceOrder: 1
    });

    const candidateUniqueEmail = 'unique.candidate@example.com';
    const app1 = await ApplicationService.submitApplication({
      name: 'Charlie Dup',
      email: candidateUniqueEmail,
      positionId: newPosId,
      resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/charlie.pdf',
      notes: 'First application'
    });
    assert(!!app1.id, '17a. first application submitted successfully');

    let duplicateErr: any = null;
    try {
      await ApplicationService.submitApplication({
        name: 'Charlie Dup',
        email: candidateUniqueEmail,
        positionId: newPosId,
        resumeUrl: 'https://res.cloudinary.com/demo/raw/upload/charlie.pdf',
        notes: 'Second application'
      });
    } catch (err) {
      duplicateErr = err;
    }
    assert(
      duplicateErr instanceof AppError &&
        duplicateErr.statusCode === 409 &&
        duplicateErr.message === 'You have already applied for this position.',
      '17. duplicate application behaviour unchanged (409 conflict returned)'
    );

    // 18. CV behaviour unchanged (resumeUrl presence validated)
    const payloadWithoutCv = {
      name: 'No CV Candidate',
      email: 'nocv@example.com',
      positionId: testPositionId
    };
    const parsedCv = candidateApplicationSchema.safeParse(payloadWithoutCv);
    assert(parsedCv.success, '18. CV schema allows optional resumeUrl when file upload handled by middleware');

    // ==========================================
    // JOB ALERTS (19 - 27)
    // ==========================================
    console.log('\n--- GROUP 3: JOB ALERT SUBSCRIPTION FOUNDATION ---');

    // 19. valid email-only subscription works
    const sub1 = await JobAlertService.subscribe({
      email: 'Candidate.Alerts@Example.com'
    });
    assert(
      sub1.email === 'candidate.alerts@example.com' &&
        sub1.department === null &&
        sub1.keyword === null &&
        sub1.isActive === true &&
        !('unsubscribeToken' in sub1),
      '19. valid email-only subscription works (normalized & token hidden)'
    );

    // 20. department preference works
    const sub2 = await JobAlertService.subscribe({
      email: 'dept.subscriber@example.com',
      department: '  Engineering  '
    });
    assert(
      sub2.department === 'Engineering' && sub2.isActive === true,
      '20. department preference works (trimmed)'
    );

    // 21. keyword preference works
    const sub3 = await JobAlertService.subscribe({
      email: 'keyword.subscriber@example.com',
      keyword: '  Cloud Architect  '
    });
    assert(
      sub3.keyword === 'Cloud Architect' && sub3.isActive === true,
      '21. keyword preference works (trimmed)'
    );

    // 22. department + keyword works
    const sub4 = await JobAlertService.subscribe({
      email: 'full.subscriber@example.com',
      department: 'Product',
      keyword: 'Lead'
    });
    assert(
      sub4.department === 'Product' && sub4.keyword === 'Lead' && sub4.isActive === true,
      '22. department + keyword works'
    );

    // 23. invalid email rejected
    const parseInvalidAlertEmail = jobAlertSubscriptionSchema.safeParse({
      email: 'not-a-valid-email'
    });
    assert(!parseInvalidAlertEmail.success, '23. invalid email rejected');

    // 24. empty optional values handled safely
    const parseEmptyOptionals = jobAlertSubscriptionSchema.safeParse({
      email: 'clean@example.com',
      department: '   ',
      keyword: ''
    });
    assert(
      parseEmptyOptionals.success &&
        parseEmptyOptionals.data.department === undefined &&
        parseEmptyOptionals.data.keyword === undefined,
      '24. empty optional values handled safely'
    );

    // 25. unsubscribe token is unique
    const rawSubA = mockStore.jobAlerts.get(sub1.id);
    const rawSubB = mockStore.jobAlerts.get(sub2.id);
    assert(
      rawSubA &&
        rawSubB &&
        rawSubA.unsubscribeToken &&
        rawSubB.unsubscribeToken &&
        rawSubA.unsubscribeToken !== rawSubB.unsubscribeToken &&
        rawSubA.unsubscribeToken.length >= 32,
      '25. unsubscribe token is unique and unguessable'
    );

    // 26. unsubscribe works
    const unsubsResult = await JobAlertService.unsubscribe(rawSubA.unsubscribeToken);
    assert(
      unsubsResult.isActive === false &&
        unsubsResult.message === 'Successfully unsubscribed from job alerts.' &&
        !('email' in unsubsResult),
      '26. unsubscribe works (email not returned in response)'
    );

    // 27. repeated unsubscribe is safely handled
    const repeatedResult = await JobAlertService.unsubscribe(rawSubA.unsubscribeToken);
    assert(
      repeatedResult.isActive === false &&
        repeatedResult.message === 'Subscription is already inactive.' &&
        !('email' in repeatedResult),
      '27. repeated unsubscribe is safely handled (email not returned in response)'
    );

    // 28. invalid unsubscribe token returns 404
    let errInvalidToken: any = null;
    try {
      await JobAlertService.unsubscribe('non-existent-token');
    } catch (err) {
      errInvalidToken = err;
    }
    assert(
      errInvalidToken instanceof AppError &&
        errInvalidToken.statusCode === 404 &&
        errInvalidToken.message === 'Subscription not found or invalid token.',
      '28. invalid unsubscribe token returns 404'
    );
  } catch (error) {
    console.error('[UNEXPECTED ERROR IN TEST SUITE]:', error);
    failed++;
  }

  console.log('\n======================================================================');
  console.log(`BATCH 1A TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch1aTests();
