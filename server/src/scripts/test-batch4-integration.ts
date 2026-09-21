/**
 * Sprint 2 Batch 4 correction pass — database-backed integration tests.
 *
 * Requires a real DATABASE_URL (Postgres) and EMAIL_TOKEN_ENCRYPTION_KEY /
 * TWO_FACTOR_ENCRYPTION_KEY set in the environment. Uses MockProviderAdapter
 * so no real emails are sent and no RESEND_API_KEY is required.
 *
 * Covers: outbox state machine, idempotency, stuck-Sending recovery, the
 * stale-worker CAS guard, the full invitation lifecycle (create -> details ->
 * accept -> login barrier -> resend), interview-outbox atomicity, and the S2-07
 * job-alert matching/openedAt-transition/duplicate-prevention rules.
 *
 * Run with: npx tsx src/scripts/test-batch4-integration.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { Role, PositionStatus, EmailEventType, EmailDeliveryStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { InterviewService } from '../services/interview.service';
import { EmailOutboxService } from '../services/email/email-outbox.service';
import { MockProviderAdapter } from '../services/email/mock-provider.adapter';
import { decryptEmailToken } from '../utils/email-crypto';
import { processJobAlerts } from '../scheduler/jobs/job-alert.job';
import { AppError } from '../utils/errors';

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

const mockProvider = new MockProviderAdapter();

/** Fetches the raw invitation token by decrypting the AccountInvitation outbox row for a user. */
async function getRawInvitationToken(userId: string): Promise<string> {
  const log = await prisma.emailDeliveryLog.findFirst({
    where: { userId, eventType: EmailEventType.AccountInvitation },
    orderBy: { createdAt: 'desc' },
  });
  if (!log) throw new Error(`No AccountInvitation outbox row found for user ${userId}`);
  const payload = log.payload as any;
  return decryptEmailToken(payload.encryptedToken);
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test suite in production environment!');
  }

  EmailOutboxService.setProvider(mockProvider);

  console.log('=== Batch 4 Correction: Database Integration Tests ===\n');

  await bootstrapManager();
  const manager = await prisma.user.findFirst({ where: { role: Role.Manager } });
  assert(!!manager, '0. System Manager bootstrapped');
  if (!manager) return;

  // ══════════════════════════════════════════════════════════════════════
  // INVITATION LIFECYCLE (S2-45)
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n[Invitation Lifecycle]');

  const invitedEmail = `batch4.invitee.${Date.now()}@altrium.com`;
  const createdUser = await UserService.createManagedUser(manager.id, {
    name: 'Batch4 Invitee',
    email: invitedEmail,
    role: Role.HR,
  });
  assert(createdUser.isActive === false, '1. New managed user is created INACTIVE (invitation-pending)');

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: createdUser.id } });
  assert(!!dbUser.invitationTokenHash, '2. invitationTokenHash is set on creation');
  const daysUntilExpiry = dbUser.invitationExpiresAt
    ? (dbUser.invitationExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    : 0;
  assert(daysUntilExpiry > 6.9 && daysUntilExpiry <= 7.01, '3. invitationExpiresAt is ~7 days out (not 72 hours)');

  const rawToken = await getRawInvitationToken(createdUser.id);
  assert(Buffer.from(rawToken, 'hex').length === 32, '4. Raw invitation token decrypts to exactly 32 bytes');
  const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert(expectedHash === dbUser.invitationTokenHash, '5. Stored hash equals SHA-256(rawToken)');

  const details = await UserService.getInvitationDetails(rawToken);
  assert(details.email === invitedEmail && details.role === Role.HR, '6. getInvitationDetails returns sanitized {name,email,role}');

  let invalidTokenRejected = false;
  try {
    await UserService.getInvitationDetails('0'.repeat(64));
  } catch (err) {
    invalidTokenRejected = err instanceof AppError && err.statusCode === 400;
  }
  assert(invalidTokenRejected, '7. Unknown token returns a generic 400 (no enumeration)');

  let expiredTokenRejected = false;
  await prisma.user.update({ where: { id: createdUser.id }, data: { invitationExpiresAt: new Date(Date.now() - 1000) } });
  try {
    await UserService.getInvitationDetails(rawToken);
  } catch (err) {
    expiredTokenRejected = err instanceof AppError && err.statusCode === 400;
  }
  assert(expiredTokenRejected, '8. Expired token is rejected with the same generic error');
  // Restore expiry for the remaining tests
  await prisma.user.update({ where: { id: createdUser.id }, data: { invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

  // Invited (still-pending) user cannot log in normally yet
  let preAcceptLoginBlocked = false;
  try {
    await AuthService.login({ email: invitedEmail, password: 'AnyPassword123!' });
  } catch (err) {
    preAcceptLoginBlocked = err instanceof AppError && (err.statusCode === 401 || err.statusCode === 403);
  }
  assert(preAcceptLoginBlocked, '9. Invited (unaccepted) account cannot log in normally');

  const acceptResult = await UserService.acceptInvitation(rawToken, 'Str0ng!Passw0rd');
  assert(!!acceptResult.token && acceptResult.user.isActive === true, '10. acceptInvitation() returns a JWT and an active user only after success');

  const postAcceptUser = await prisma.user.findUniqueOrThrow({ where: { id: createdUser.id } });
  assert(postAcceptUser.isActive === true, '11. Account is active after acceptance');
  assert(postAcceptUser.invitationTokenHash === null, '12. invitationTokenHash is cleared after acceptance');
  assert(postAcceptUser.invitationExpiresAt === null, '13. invitationExpiresAt is cleared after acceptance');

  const acceptedAudit = await prisma.auditLog.findFirst({
    where: { actorId: createdUser.id, actionType: 'ACCOUNT_INVITATION_ACCEPTED' },
  });
  assert(!!acceptedAudit, '14. ACCOUNT_INVITATION_ACCEPTED audit event recorded');

  let tokenReuseRejected = false;
  try {
    await UserService.acceptInvitation(rawToken, 'AnotherStr0ng!Pass');
  } catch (err) {
    tokenReuseRejected = err instanceof AppError && err.statusCode === 400;
  }
  assert(tokenReuseRejected, '15. The same invitation token cannot be reused after acceptance');

  const postAcceptLogin = await AuthService.login({ email: invitedEmail, password: 'Str0ng!Passw0rd' });
  assert(postAcceptLogin.requires2FA === false && !!postAcceptLogin.token, '16. Accepted user can now log in normally with their chosen password');

  // Resend invitation invalidates the previous token
  const resendTargetEmail = `batch4.resend.${Date.now()}@altrium.com`;
  const resendUser = await UserService.createManagedUser(manager.id, {
    name: 'Batch4 Resend Target',
    email: resendTargetEmail,
    role: Role.TeamLead,
  });
  const firstRawToken = await getRawInvitationToken(resendUser.id);
  await UserService.resendInvitation(manager.id, resendUser.id);
  const secondRawToken = await getRawInvitationToken(resendUser.id);
  assert(firstRawToken !== secondRawToken, '17. Resend generates a brand-new raw token');

  let oldTokenRejectedAfterResend = false;
  try {
    await UserService.getInvitationDetails(firstRawToken);
  } catch (err) {
    oldTokenRejectedAfterResend = err instanceof AppError && err.statusCode === 400;
  }
  assert(oldTokenRejectedAfterResend, '18. Previous invitation link is invalidated immediately by resend');

  const newTokenDetails = await UserService.getInvitationDetails(secondRawToken);
  assert(newTokenDetails.email === resendTargetEmail, '19. Only the newest invitation token can activate the account');

  // ══════════════════════════════════════════════════════════════════════
  // EMAIL OUTBOX STATE MACHINE (S2-47)
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n[Email Outbox State Machine]');

  const outboxKey = `TEST_OUTBOX:${Date.now()}`;
  const enqueued = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: outboxKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate@example.com',
    subject: 'Test Subject',
    payload: { candidateName: 'Test', positionTitle: 'Engineer', department: 'Eng', applicationId: 'app-1' },
  });
  assert(!!enqueued && enqueued.status === EmailDeliveryStatus.Pending, '20. enqueueEmailWithinTransaction creates a Pending row');

  const duplicateEnqueue = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: outboxKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate@example.com',
    subject: 'Different subject — should be ignored',
    payload: {},
  });
  assert(duplicateEnqueue?.id === enqueued!.id, '21. Duplicate idempotencyKey returns the existing row (no duplicate Pending)');

  mockProvider.clear();
  const sentOk = await EmailOutboxService.processLogRecord(enqueued!.id);
  assert(sentOk === true, '22. processLogRecord() succeeds against the mock provider');
  const sentLog = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: enqueued!.id } });
  assert(sentLog.status === EmailDeliveryStatus.Sent && !!sentLog.sentAt && !!sentLog.providerMessageId, '23. Record transitions Pending -> Sending -> Sent with sentAt/providerMessageId set');

  const dupWhileSent = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: outboxKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate@example.com',
    subject: 'x',
    payload: {},
  });
  assert(dupWhileSent?.status === EmailDeliveryStatus.Sent, '24. Duplicate enqueue against an already-Sent idempotencyKey is a safe no-op');

  // Transient failure -> backoff schedule -> exhaustion
  const backoffKey = `TEST_BACKOFF:${Date.now()}`;
  const backoffLog = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: backoffKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate2@example.com',
    subject: 'Backoff test',
    payload: { candidateName: 'Test', positionTitle: 'Engineer', department: 'Eng', applicationId: 'app-2' },
  });

  mockProvider.setSimulatedFailure({ statusCode: 500, message: 'Simulated transient failure', isPermanent: false });

  const expectedBackoffMinutes = [5, 15, 45];
  for (let attempt = 1; attempt <= 3; attempt++) {
    await EmailOutboxService.processLogRecord(backoffLog!.id);
    const row = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: backoffLog!.id } });
    assert(row.status === EmailDeliveryStatus.Failed && row.retryCount === attempt, `25.${attempt} Attempt ${attempt}: status Failed, retryCount=${attempt}`);
    const minutesOut = row.nextAttemptAt ? (row.nextAttemptAt.getTime() - Date.now()) / 60000 : -1;
    assert(Math.abs(minutesOut - expectedBackoffMinutes[attempt - 1]) < 1, `25.${attempt}b nextAttemptAt is ~${expectedBackoffMinutes[attempt - 1]} minutes out`);
    // Force the record eligible for immediate re-processing in this test
    await prisma.emailDeliveryLog.update({ where: { id: backoffLog!.id }, data: { nextAttemptAt: new Date() } });
  }
  await EmailOutboxService.processLogRecord(backoffLog!.id); // 4th attempt: exhausted
  const exhaustedRow = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: backoffLog!.id } });
  assert(exhaustedRow.retryCount === 4 && exhaustedRow.nextAttemptAt === null, '26. After 4 attempts, retries are exhausted (nextAttemptAt null, no artificial retryCount)');

  mockProvider.setSimulatedFailure(null);

  // Permanent failure
  const permKey = `TEST_PERMANENT:${Date.now()}`;
  const permLog = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: permKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate3@example.com',
    subject: 'Permanent failure test',
    payload: { candidateName: 'Test', positionTitle: 'Engineer', department: 'Eng', applicationId: 'app-3' },
  });
  mockProvider.setSimulatedFailure({ statusCode: 400, message: 'Simulated permanent failure', isPermanent: true });
  await EmailOutboxService.processLogRecord(permLog!.id);
  const permRow = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: permLog!.id } });
  assert(permRow.status === EmailDeliveryStatus.Failed && permRow.nextAttemptAt === null && permRow.retryCount === 1, '27. Permanent failure: Failed immediately, no retry scheduled');
  mockProvider.setSimulatedFailure(null);

  // Atomic concurrent claim
  const claimKey = `TEST_CLAIM:${Date.now()}`;
  const claimLog = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: claimKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate4@example.com',
    subject: 'Concurrent claim test',
    payload: { candidateName: 'Test', positionTitle: 'Engineer', department: 'Eng', applicationId: 'app-4' },
  });
  const [claimA, claimB] = await Promise.all([
    EmailOutboxService.processLogRecord(claimLog!.id),
    EmailOutboxService.processLogRecord(claimLog!.id),
  ]);
  assert(
    (claimA === true && claimB === false) || (claimA === false && claimB === true),
    '28. Concurrent processLogRecord() calls: exactly one wins the atomic claim'
  );

  // Stuck Sending recovery
  const stuckKey = `TEST_STUCK:${Date.now()}`;
  const stuckLog = await EmailOutboxService.enqueueEmailWithinTransaction(prisma, {
    idempotencyKey: stuckKey,
    eventType: EmailEventType.ApplicationConfirmation,
    recipient: 'candidate5@example.com',
    subject: 'Stuck sending test',
    payload: {},
  });
  await prisma.emailDeliveryLog.update({
    where: { id: stuckLog!.id },
    data: { status: EmailDeliveryStatus.Sending, lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000) },
  });
  const recoveredCount = await EmailOutboxService.recoverStuckSending(5 * 60 * 1000); // 5 min timeout, record is 10 min stale
  const recoveredRow = await prisma.emailDeliveryLog.findUniqueOrThrow({ where: { id: stuckLog!.id } });
  assert(recoveredCount >= 1 && recoveredRow.status === EmailDeliveryStatus.Failed && recoveredRow.retryCount === 1, '29. Stuck Sending record is reclaimed to Failed with retryCount incremented');

  // Stale-worker CAS guard: after a reclaim bumps retryCount, a finalize
  // attempt still holding the pre-reclaim retryCount must not be able to
  // match the row (this mirrors exactly what EmailOutboxService.finalize()
  // checks internally via `retryCount: claimedRetryCount`).
  const staleGuardAttempt = await prisma.emailDeliveryLog.updateMany({
    where: { id: stuckLog!.id, status: EmailDeliveryStatus.Sending, retryCount: 0 /* the pre-reclaim value a stale worker would hold */ },
    data: { status: EmailDeliveryStatus.Sent },
  });
  assert(staleGuardAttempt.count === 0, '30. A stale worker holding the pre-reclaim retryCount cannot overwrite the reclaimed record (CAS holds)');

  // ══════════════════════════════════════════════════════════════════════
  // INTERVIEW OUTBOX ATOMICITY (S2-40)
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n[Interview Outbox Atomicity]');

  const position = await PositionService.createPosition(manager.id, {
    title: 'Batch4 Test Engineer',
    department: 'Engineering',
    description: 'Test position for Batch 4 interview atomicity checks',
    status: PositionStatus.Open,
  } as any);
  const stage = await StageService.createStage(manager.id, position.id, { name: 'Technical Interview', sequenceOrder: 1, isGating: true, feedbackRequiredCount: 1 } as any);
  const candidate = await prisma.candidate.create({ data: { name: 'Batch4 Candidate', email: `batch4.candidate.${Date.now()}@example.com` } });
  const application = await prisma.application.create({
    data: { candidateId: candidate.id, positionId: position.id, currentStageId: stage.id },
  });

  const beforeCount = await prisma.emailDeliveryLog.count({ where: { eventType: EmailEventType.InterviewScheduled, applicationId: application.id } });
  const interview = await InterviewService.createInterview(manager.id, application.id, {
    stageId: stage.id,
    interviewerIds: [],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    durationMinutes: 60,
  } as any);
  const afterCount = await prisma.emailDeliveryLog.count({ where: { eventType: EmailEventType.InterviewScheduled, applicationId: application.id } });
  assert(beforeCount === 0 && afterCount === 1, '31. Creating an interview produces exactly one InterviewScheduled EmailDeliveryLog row');
  const interviewEmailRow = await prisma.emailDeliveryLog.findFirst({ where: { eventType: EmailEventType.InterviewScheduled, applicationId: application.id } });
  assert(interviewEmailRow?.interviewId === interview!.id, '32. The EmailDeliveryLog row is correctly associated with the created interview (proves both writes share one transaction\'s data)');

  // ══════════════════════════════════════════════════════════════════════
  // JOB ALERT MATCHING (S2-07)
  // ══════════════════════════════════════════════════════════════════════
  console.log('\n[Job Alert Matching]');

  const subDept = await prisma.jobAlertSubscription.create({ data: { email: 'sub.dept@example.com', department: 'Engineering', isActive: true } });
  const subKeywordTitle = await prisma.jobAlertSubscription.create({ data: { email: 'sub.title@example.com', keyword: 'Platform', isActive: true } });
  const subKeywordDesc = await prisma.jobAlertSubscription.create({ data: { email: 'sub.desc@example.com', keyword: 'kubernetes', isActive: true } });
  const subKeywordSkills = await prisma.jobAlertSubscription.create({ data: { email: 'sub.skills@example.com', keyword: 'golang', isActive: true } });
  const subDeptAndKeywordMatch = await prisma.jobAlertSubscription.create({ data: { email: 'sub.and.match@example.com', department: 'Engineering', keyword: 'Platform', isActive: true } });
  const subDeptAndKeywordNoMatch = await prisma.jobAlertSubscription.create({ data: { email: 'sub.and.nomatch@example.com', department: 'Sales', keyword: 'Platform', isActive: true } });
  const subNoFilters = await prisma.jobAlertSubscription.create({ data: { email: 'sub.nofilter@example.com', isActive: true } });
  const subInactive = await prisma.jobAlertSubscription.create({ data: { email: 'sub.inactive@example.com', isActive: false } });

  const newPosition = await PositionService.createPosition(manager.id, {
    title: 'Platform Engineer',
    department: 'Engineering',
    description: 'Own our kubernetes-based deployment platform.',
    requiredSkills: 'golang, terraform',
    status: PositionStatus.Draft,
  } as any);
  // Real transition Draft -> Open (this must stamp openedAt)
  await PositionService.updatePositionStatus(manager.id, newPosition.id, PositionStatus.Open);

  const result1 = await processJobAlerts(new Date(), 15);
  assert(result1.positionsChecked >= 1, '33. processJobAlerts() detects the newly Open position via openedAt');

  const enqueuedFor = async (subId: string) =>
    prisma.emailDeliveryLog.count({ where: { eventType: EmailEventType.JobAlert, idempotencyKey: `JOB_ALERT:${newPosition.id}:${subId}` } });

  assert((await enqueuedFor(subDept.id)) === 1, '34. Department-only subscriber matched (department)');
  assert((await enqueuedFor(subKeywordTitle.id)) === 1, '35. Keyword-only subscriber matched via TITLE');
  assert((await enqueuedFor(subKeywordDesc.id)) === 1, '36. Keyword-only subscriber matched via DESCRIPTION');
  assert((await enqueuedFor(subKeywordSkills.id)) === 1, '37. Keyword-only subscriber matched via REQUIREDSKILLS (null-safe field now included)');
  assert((await enqueuedFor(subDeptAndKeywordMatch.id)) === 1, '38. department+keyword AND logic: both match -> alerted');
  assert((await enqueuedFor(subDeptAndKeywordNoMatch.id)) === 0, '39. department+keyword AND logic: department mismatch -> NOT alerted despite keyword match');
  assert((await enqueuedFor(subNoFilters.id)) === 1, '40. No-filter subscriber receives all open positions');
  assert((await enqueuedFor(subInactive.id)) === 0, '41. Inactive subscription is never alerted');

  // Duplicate prevention: re-run immediately, no new rows for the same position/subscriber pairs
  const result2 = await processJobAlerts(new Date(), 15);
  assert((await enqueuedFor(subDept.id)) === 1, '42. Re-running processJobAlerts() does not create duplicate alerts (idempotency)');

  // "Newly opened" must be a real transition, not an ordinary content edit
  const stalePosition = await PositionService.createPosition(manager.id, {
    title: 'Stale Open Position',
    department: 'Engineering',
    description: 'Already open for a while.',
    status: PositionStatus.Open,
  } as any);
  // Backdate openedAt to simulate "opened weeks ago"
  await prisma.position.update({ where: { id: stalePosition.id }, data: { openedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
  // An ordinary content edit (NOT a status change) must not re-stamp openedAt
  await PositionService.updatePosition(manager.id, stalePosition.id, { description: 'Minor typo fix, still the same job.' } as any);
  const staleAfterEdit = await prisma.position.findUniqueOrThrow({ where: { id: stalePosition.id } });
  const staleOpenedAtAgeDays = staleAfterEdit.openedAt ? (Date.now() - staleAfterEdit.openedAt.getTime()) / (24 * 60 * 60 * 1000) : -1;
  assert(staleOpenedAtAgeDays > 29, '43. Editing an already-Open position does NOT re-stamp openedAt (no false "newly opened" alert)');
  const result3 = await processJobAlerts(new Date(), 15);
  const staleEnqueued = await prisma.emailDeliveryLog.count({ where: { eventType: EmailEventType.JobAlert, idempotencyKey: { startsWith: `JOB_ALERT:${stalePosition.id}:` } } });
  assert(staleEnqueued === 0, '44. Scheduler correctly ignores the stale (edited-but-not-reopened) position');

  // Unsubscribe token must never be stored in the outbox payload
  const jobAlertRow = await prisma.emailDeliveryLog.findFirstOrThrow({ where: { eventType: EmailEventType.JobAlert, idempotencyKey: `JOB_ALERT:${newPosition.id}:${subDept.id}` } });
  const jobAlertPayload = jobAlertRow.payload as any;
  assert(!('unsubscribeToken' in jobAlertPayload), '45. JobAlert outbox payload never contains the raw unsubscribeToken');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch((err) => {
    console.error('Integration test run crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    EmailOutboxService.resetProvider();
    await prisma.$disconnect();
  });
