import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { activateTestUserWithPassword } from './_test-helpers';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationService } from '../services/application.service';
import { ApplicationManagementService } from '../services/application-management.service';
import { InterviewService } from '../services/interview.service';
import { FeedbackService } from '../services/feedback.service';
import { Role, PositionStatus, ApplicationStatus, InterviewStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runFeedbackProgressionTests() {
  // Production safeguard — must be first before any DB operation
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 BATCH 2 — FEEDBACK & STAGE ADVANCEMENT SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // ── 0. Full teardown ──────────────────────────────────────────────────────
    await prisma.feedbackCriterionScore.deleteMany({});
    await prisma.feedback.deleteMany({});
    await prisma.interviewerAssignment.deleteMany({});
    await prisma.interview.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.stage.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.user.deleteMany({});

    // ── 1. Bootstrap users ────────────────────────────────────────────────────
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerUser, '1. System Manager bootstrapped');

    const hrUser = await UserService.createManagedUser(managerUser!.id, {
      name: 'HR Batch2', email: 'hr.batch2@altrium.com', role: Role.HR
    });
    await activateTestUserWithPassword('hr.batch2@altrium.com', 'HrPass123!');
    assert(hrUser.role === Role.HR, '2. HR account created');

    const teamLead1 = await UserService.createManagedUser(managerUser!.id, {
      name: 'Team Lead Alpha', email: 'tla@altrium.com', role: Role.TeamLead
    });
    await activateTestUserWithPassword('tla@altrium.com', 'TlPass123!');
    const teamLead2 = await UserService.createManagedUser(managerUser!.id, {
      name: 'Team Lead Beta', email: 'tlb@altrium.com', role: Role.TeamLead
    });
    await activateTestUserWithPassword('tlb@altrium.com', 'TlPass123!');
    const teamLead3 = await UserService.createManagedUser(managerUser!.id, {
      name: 'Team Lead Gamma', email: 'tlg@altrium.com', role: Role.TeamLead
    });
    await activateTestUserWithPassword('tlg@altrium.com', 'TlPass123!');
    assert(
      teamLead1.role === Role.TeamLead && teamLead2.role === Role.TeamLead && teamLead3.role === Role.TeamLead,
      '3. Three TeamLead accounts created'
    );

    // ── 2. Create Position & Stages with varying gating configurations ────────
    const position = await PositionService.createPosition(hrUser.id, {
      title: 'Full Stack Engineer', department: 'Engineering', description: 'TypeScript/Node.js'
    });
    await prisma.position.update({ where: { id: position.id }, data: { status: PositionStatus.Open } });

    // Stage 1: Gating, requires 1 feedback
    const stage1 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Technical Screen', sequenceOrder: 1, isGating: true, feedbackRequiredCount: 1
    });

    // Stage 2: Gating, requires 2 feedbacks
    const stage2 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Panel Interview', sequenceOrder: 2, isGating: true, feedbackRequiredCount: 2
    });

    // Stage 3: Non-gating
    const stage3 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Manager Review', sequenceOrder: 3, isGating: false, feedbackRequiredCount: 0
    });

    // Stage 4: Gating with feedbackRequiredCount = 0 (bypassed)
    const stage4 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Offer Stage', sequenceOrder: 4, isGating: true, feedbackRequiredCount: 0
    });

    // Position 2 for cross-position isolation tests
    const pos2 = await PositionService.createPosition(hrUser.id, {
      title: 'Product Manager', department: 'Product', description: 'PM'
    });
    await prisma.position.update({ where: { id: pos2.id }, data: { status: PositionStatus.Open } });
    const pos2Stage1 = await StageService.createStage(hrUser.id, pos2.id, {
      name: 'PM Screen', sequenceOrder: 1, isGating: true, feedbackRequiredCount: 1
    });

    // ── 3. Submit Applications ─────────────────────────────────────────────────
    const app1 = await ApplicationService.submitApplication({
      name: 'Bob Candidate', email: 'bob@example.com', phone: '555-0001',
      resumeUrl: 'https://resume.example.com/bob', positionId: position.id
    });
    assert(app1.currentStageId === stage1.id, '4. Application 1 submitted to Stage 1');

    const app2 = await ApplicationService.submitApplication({
      name: 'Carol Candidate', email: 'carol@example.com', phone: '555-0002',
      resumeUrl: 'https://resume.example.com/carol', positionId: position.id
    });
    assert(app2.currentStageId === stage1.id, '5. Application 2 submitted to Stage 1');

    const appPos2 = await ApplicationService.submitApplication({
      name: 'Dave Candidate', email: 'dave@example.com', phone: '555-0003',
      resumeUrl: 'https://resume.example.com/dave', positionId: pos2.id
    });

    // ── 4. Schedule Interviews ─────────────────────────────────────────────────
    // Three separate interviews below reuse teamLead1/teamLead2 as interviewers
    // and are never cancelled, so each needs a distinct time — S2-13 scheduling
    // conflict detection correctly rejects double-booking the same interviewer.
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureDate2 = new Date(futureDate.getTime() + 3 * 60 * 60 * 1000);
    const futureDate3 = new Date(futureDate.getTime() + 6 * 60 * 60 * 1000);

    // Interview 1 for App 1 at Stage 1 (interviewers: teamLead1, teamLead2)
    const interview1 = await InterviewService.createInterview(hrUser.id, app1.id, {
      stageId:        stage1.id,
      scheduledAt:    futureDate,
      interviewerIds: [teamLead1.id, teamLead2.id]
    });
    assert(!!interview1?.id, '6. Interview 1 created for Application 1 at Stage 1');

    // ═══════════════════════════════════════════════════════════════
    // FEEDBACK SUBMISSION TESTS (7–20)
    // ═══════════════════════════════════════════════════════════════

    // Test 7 — TeamLead 1 submits feedback with criterion scores
    const feedback1 = await FeedbackService.submitFeedback(
      { id: teamLead1.id, role: Role.TeamLead },
      interview1!.id,
      {
        overallRating:   4.5,
        comments:        'Strong architectural understanding and clean problem decomposition.',
        criterionScores: [
          { criterionName: 'Code Quality', weight: 1.5, score: 4.8 },
          { criterionName: 'System Design', weight: 1.0, score: 4.2 }
        ]
      }
    );

    assert(!!feedback1?.id, '7. Assigned TeamLead 1 submits feedback successfully');
    assert(Number(feedback1?.overallRating) === 4.5, '8. Feedback.overallRating stored accurately as Decimal(3,1)');
    assert((feedback1?.criterionScores?.length ?? 0) === 2, '9. Two FeedbackCriterionScore records created');
    assert(Number(feedback1?.criterionScores[0].weight) === 1.5, '10. Criterion weight stored accurately as Decimal(4,2)');
    assert(Number(feedback1?.criterionScores[0].score) === 4.8, '11. Criterion score stored accurately as Decimal(4,2)');

    // Test 12 — Assignment feedbackSubmitted state
    const assignment1 = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview1!.id, interviewerId: teamLead1.id } }
    });
    assert(assignment1?.feedbackSubmitted === true, '12. InterviewerAssignment.feedbackSubmitted updated to true');

    // Test 13 — FEEDBACK_SUBMITTED audit log
    const feedbackAudit = await prisma.auditLog.findFirst({
      where: { entityId: feedback1!.id, actionType: 'FEEDBACK_SUBMITTED' }
    });
    assert(!!feedbackAudit && feedbackAudit.actorId === teamLead1.id, '13. FEEDBACK_SUBMITTED audit log recorded');

    // Test 14 — Audit details contains no comments or PII
    const feedbackAuditDetails = JSON.parse(feedbackAudit!.details || '{}');
    assert(
      !feedbackAudit!.details?.includes('Strong architectural') &&
      !feedbackAudit!.details?.includes('bob@example.com') &&
      !feedbackAudit!.details?.includes('Bob Candidate'),
      '14. FEEDBACK_SUBMITTED audit details exclude comments and candidate personal data'
    );
    assert(
      feedbackAuditDetails.interviewId === interview1!.id &&
      feedbackAuditDetails.applicationId === app1.id &&
      feedbackAuditDetails.overallRating === 4.5 &&
      feedbackAuditDetails.criteriaCount === 2,
      '15. FEEDBACK_SUBMITTED audit details contain interviewId, applicationId, overallRating, criteriaCount'
    );

    // Test 16 — Unassigned TeamLead 3 blocked from submitting feedback
    try {
      await FeedbackService.submitFeedback(
        { id: teamLead3.id, role: Role.TeamLead },
        interview1!.id,
        { overallRating: 3.0, comments: 'Should fail' }
      );
      assert(false, '16. Unassigned TeamLead should be blocked from submitting feedback');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '16. Unassigned TeamLead receives 403 Forbidden');
    }

    // Test 17 — HR blocked from submitting feedback
    try {
      await FeedbackService.submitFeedback(
        { id: hrUser.id, role: Role.HR },
        interview1!.id,
        { overallRating: 4.0, comments: 'HR feedback' }
      );
      assert(false, '17. HR should be blocked from submitting feedback');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '17. HR receives 403 Forbidden on feedback submit');
    }

    // Test 18 — Manager blocked from submitting feedback
    try {
      await FeedbackService.submitFeedback(
        { id: managerUser!.id, role: Role.Manager },
        interview1!.id,
        { overallRating: 4.0, comments: 'Manager feedback' }
      );
      assert(false, '18. Manager should be blocked from submitting feedback');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '18. Manager receives 403 Forbidden on feedback submit');
    }

    // Test 19 — Duplicate feedback submission from TeamLead 1 rejected with 409
    try {
      await FeedbackService.submitFeedback(
        { id: teamLead1.id, role: Role.TeamLead },
        interview1!.id,
        { overallRating: 5.0, comments: 'Duplicate attempt' }
      );
      assert(false, '19. Duplicate feedback should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 409, '19. Duplicate feedback receives 409 Conflict');
    }

    // Test 20 — Precision bounds validation via Zod
    const { submitFeedbackSchema } = await import('../schemas/feedback.schema');
    const invalidRating = submitFeedbackSchema.safeParse({ overallRating: -1 });
    assert(!invalidRating.success, '20. Negative overallRating rejected by schema');

    const overflowRating = submitFeedbackSchema.safeParse({ overallRating: 100.5 });
    assert(!overflowRating.success, '21. Decimal overflow rating (>99.9) rejected by schema');

    // ═══════════════════════════════════════════════════════════════
    // FEEDBACK READ ACCESS TESTS (22–27)
    // ═══════════════════════════════════════════════════════════════

    // HR views all feedback
    const hrFeedbackView = await FeedbackService.getFeedbacksForInterview(
      { id: hrUser.id, role: Role.HR }, interview1!.id
    );
    assert(hrFeedbackView.length === 1, '22. HR can view all feedback for interview');

    // Manager views all feedback (read-only)
    const managerFeedbackView = await FeedbackService.getFeedbacksForInterview(
      { id: managerUser!.id, role: Role.Manager }, interview1!.id
    );
    assert(managerFeedbackView.length === 1, '23. Manager can view all feedback for interview (read-only)');

    // TeamLead 1 views ONLY their own feedback
    const tl1FeedbackView = await FeedbackService.getFeedbacksForInterview(
      { id: teamLead1.id, role: Role.TeamLead }, interview1!.id
    );
    assert(
      tl1FeedbackView.length === 1 && tl1FeedbackView[0].interviewerId === teamLead1.id,
      '24. TeamLead 1 views only their own submitted feedback'
    );

    // Unassigned TeamLead 3 blocked from reading feedback
    try {
      await FeedbackService.getFeedbacksForInterview(
        { id: teamLead3.id, role: Role.TeamLead }, interview1!.id
      );
      assert(false, '25. Unassigned TeamLead should be blocked from reading feedback');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '25. Unassigned TeamLead receives 403 Forbidden');
    }

    // Security: passwordHash excluded from feedback response
    const feedbackStr = JSON.stringify(hrFeedbackView);
    assert(!feedbackStr.includes('passwordHash'), '26. Feedback response does NOT contain passwordHash');

    // ═══════════════════════════════════════════════════════════════
    // GATE ENFORCEMENT & STAGE ADVANCEMENT TESTS (27–40)
    // ═══════════════════════════════════════════════════════════════

    // Application 2 is at Stage 1 (isGating: true, feedbackRequiredCount: 1), but has 0 feedback
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, app2.id, { stageId: stage2.id });
      assert(false, '27. Gating stage with 0 feedback should block movement');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 409 && err.message.includes('Stage movement blocked'),
        '27. Insufficient feedback returns 409 Conflict'
      );
    }

    // Verify Application 2 stage is unchanged and no audit log was created
    const app2AfterBlocked = await prisma.application.findUnique({ where: { id: app2.id } });
    assert(app2AfterBlocked?.currentStageId === stage1.id, '28. Application.currentStageId remains unchanged when blocked');

    const blockedAudit = await prisma.auditLog.findFirst({
      where: { entityId: app2.id, actionType: 'APPLICATION_STAGE_CHANGED' }
    });
    assert(!blockedAudit, '29. Zero APPLICATION_STAGE_CHANGED audit logs created on blocked attempt');

    // Cross-application feedback isolation: Application 1 has 1 feedback at Stage 1
    // Application 1 moving to Stage 2 should succeed (1 >= 1 feedback required)
    const app1Advanced = await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage2.id });
    assert(app1Advanced.currentStageId === stage2.id, '30. Application 1 satisfies Stage 1 gate (1 feedback >= 1 required) and advances to Stage 2');

    const app1StageAudit = await prisma.auditLog.findFirst({
      where: { entityId: app1.id, actionType: 'APPLICATION_STAGE_CHANGED' }
    });
    assert(!!app1StageAudit, '31. APPLICATION_STAGE_CHANGED audit log recorded on successful stage movement');

    // Application 1 status remains InProgress (status independence)
    assert(app1Advanced.status === ApplicationStatus.InProgress, '32. Application.status remains unchanged after stage movement');

    // Stage 2 requires 2 feedbacks (isGating: true, feedbackRequiredCount: 2)
    // Create Interview 2 for App 1 at Stage 2
    const interview2 = await InterviewService.createInterview(hrUser.id, app1.id, {
      stageId:        stage2.id,
      scheduledAt:    futureDate2,
      interviewerIds: [teamLead1.id, teamLead2.id]
    });

    // Attempt moving App 1 from Stage 2 to Stage 3 with 0 Stage 2 feedback -> blocked with 409
    // (Note: Stage 1 feedback from previous stage does NOT count toward Stage 2)
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage3.id });
      assert(false, '33. Previous stage feedback must not count toward current stage gate');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 409, '33. Stage 2 blocked with 0 feedback for Stage 2 (previous stage feedback ignored)');
    }

    // TeamLead 1 submits 1 feedback for Stage 2 (now count is 1, required is 2)
    await FeedbackService.submitFeedback(
      { id: teamLead1.id, role: Role.TeamLead },
      interview2!.id,
      { overallRating: 4.0, comments: 'Good panel discussion' }
    );

    // Attempt moving App 1 with 1 feedback (requires 2) -> still blocked with 409
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage3.id });
      assert(false, '34. Stage 2 with 1 feedback should still block when 2 required');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 409, '34. Stage 2 blocked with 1 feedback when 2 required');
    }

    // TeamLead 2 submits 2nd feedback for Stage 2 (now count is 2, required is 2)
    await FeedbackService.submitFeedback(
      { id: teamLead2.id, role: Role.TeamLead },
      interview2!.id,
      { overallRating: 4.2, comments: 'Panel interview approved' }
    );

    // App 1 now satisfies Stage 2 gate (2 >= 2) -> advances to Stage 3
    const app1ToStage3 = await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage3.id });
    assert(app1ToStage3.currentStageId === stage3.id, '35. Application 1 satisfies Stage 2 gate (2 feedbacks >= 2) and advances to Stage 3');

    // Stage 3 is non-gating (isGating: false) -> HR can advance to Stage 4 immediately with 0 feedback
    const app1ToStage4 = await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage4.id });
    assert(app1ToStage4.currentStageId === stage4.id, '36. Non-gating Stage 3 allows advancement with 0 feedback');

    // Stage 4 is gating with feedbackRequiredCount: 0 -> allows movement (e.g. backward to Stage 3)
    const app1BackToStage3 = await ApplicationManagementService.moveApplicationStage(hrUser.id, app1.id, { stageId: stage3.id });
    assert(app1BackToStage3.currentStageId === stage3.id, '37. Gating stage with feedbackRequiredCount: 0 allows immediate movement');

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEWER REPLACEMENT SAFETY TESTS (38–46)
    // ═══════════════════════════════════════════════════════════════

    // Create Interview 3 for App 2 at Stage 1 with TeamLead 1 and TeamLead 2
    const interview3 = await InterviewService.createInterview(hrUser.id, app2.id, {
      stageId:        stage1.id,
      scheduledAt:    futureDate3,
      interviewerIds: [teamLead1.id, teamLead2.id]
    });

    // TeamLead 1 submits feedback for Interview 3
    await FeedbackService.submitFeedback(
      { id: teamLead1.id, role: Role.TeamLead },
      interview3!.id,
      { overallRating: 3.8, comments: 'Good candidate' }
    );

    const originalAssignmentTL1 = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview3!.id, interviewerId: teamLead1.id } }
    });
    assert(originalAssignmentTL1?.feedbackSubmitted === true, '38. TeamLead 1 assignment has feedbackSubmitted: true');

    // Test 39 — Attempting to remove TeamLead 1 (who has submitted feedback) is rejected with 409 Conflict
    try {
      await InterviewService.updateInterviewers(hrUser.id, interview3!.id, {
        interviewerIds: [teamLead2.id, teamLead3.id] // removes teamLead1
      });
      assert(false, '39. Removing interviewer with submitted feedback must be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 409 && err.message.includes('already submitted feedback'),
        '39. Removing interviewer with submitted feedback rejected with 409 Conflict'
      );
    }

    // Verify zero changes after failed replacement
    const assignmentTL1AfterFailed = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview3!.id, interviewerId: teamLead1.id } }
    });
    assert(
      assignmentTL1AfterFailed?.id === originalAssignmentTL1?.id &&
      assignmentTL1AfterFailed?.feedbackSubmitted === true,
      '40. Failed replacement produced zero changes; submitted assignment intact'
    );

    // Test 41 — Diff-based replacement: retain TeamLead 1 (submitted), remove TeamLead 2 (unsubmitted), add TeamLead 3
    const updatedInterviewers = await InterviewService.updateInterviewers(hrUser.id, interview3!.id, {
      interviewerIds: [teamLead1.id, teamLead3.id]
    });
    assert(!!updatedInterviewers, '41. Diff-based interviewer replacement succeeds');

    // Test 42 — Retained TeamLead 1 preserves exact assignment ID, assignedAt, and feedbackSubmitted: true
    const assignmentTL1AfterUpdate = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview3!.id, interviewerId: teamLead1.id } }
    });
    assert(
      assignmentTL1AfterUpdate?.id === originalAssignmentTL1?.id,
      '42. Retained submitted assignment preserves original assignment ID'
    );
    assert(
      assignmentTL1AfterUpdate?.feedbackSubmitted === true,
      '43. Retained submitted assignment preserves feedbackSubmitted: true'
    );

    // Test 44 — Removed unsubmitted TeamLead 2 is gone, added TeamLead 3 exists
    const assignmentTL2 = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview3!.id, interviewerId: teamLead2.id } }
    });
    const assignmentTL3 = await prisma.interviewerAssignment.findUnique({
      where: { interviewId_interviewerId: { interviewId: interview3!.id, interviewerId: teamLead3.id } }
    });
    assert(!assignmentTL2, '44. Unsubmitted interviewer TeamLead 2 was cleanly removed');
    assert(!!assignmentTL3 && assignmentTL3.feedbackSubmitted === false, '45. Newly added interviewer TeamLead 3 was created');

    // Test 46 — Gate evaluation still correctly counts the retained submitted feedback for App 2
    const app2Advanced = await ApplicationManagementService.moveApplicationStage(hrUser.id, app2.id, { stageId: stage2.id });
    assert(
      app2Advanced.currentStageId === stage2.id,
      '46. Gate evaluation successfully counts retained submitted feedback and allows Application 2 advancement'
    );

    console.log('\n======================================================================');
    console.log(`FEEDBACK & STAGE ADVANCEMENT SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    // Cleanup in strict FK dependency order
    try {
      await prisma.feedbackCriterionScore.deleteMany({});
      await prisma.feedback.deleteMany({});
      await prisma.interviewerAssignment.deleteMany({});
      await prisma.interview.deleteMany({});
      await prisma.application.deleteMany({});
      await prisma.candidate.deleteMany({});
      await prisma.stage.deleteMany({});
      await prisma.position.deleteMany({});
      await prisma.team.deleteMany({});
    } catch (_) {}
    await prisma.$disconnect();
  }
}

runFeedbackProgressionTests();
