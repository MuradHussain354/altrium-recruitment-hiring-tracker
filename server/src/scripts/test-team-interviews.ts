import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationService } from '../services/application.service';
import { TeamAssignmentService } from '../services/team-assignment.service';
import { InterviewService } from '../services/interview.service';
import { Role, PositionStatus, InterviewStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runTeamInterviewTests() {
  // Production safeguard — must be first before any DB operation
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 BATCH 1 — TEAM ASSIGNMENT + INTERVIEW MANAGEMENT');
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
      name: 'HR Batch1', email: 'hr.batch1@altrium.com', password: 'HrPass123!', role: Role.HR
    });
    assert(hrUser.role === Role.HR, '2. HR account created');

    const teamLead1 = await UserService.createManagedUser(managerUser!.id, {
      name: 'Team Lead One', email: 'tl1@altrium.com', password: 'TlPass123!', role: Role.TeamLead
    });
    const teamLead2 = await UserService.createManagedUser(managerUser!.id, {
      name: 'Team Lead Two', email: 'tl2@altrium.com', password: 'TlPass123!', role: Role.TeamLead
    });
    assert(teamLead1.role === Role.TeamLead && teamLead2.role === Role.TeamLead, '3. TeamLead accounts created');

    // ── 2. Bootstrap Teams ────────────────────────────────────────────────────
    const teamA = await prisma.team.create({ data: { name: 'Engineering Alpha', createdById: managerUser!.id } });
    const teamB = await prisma.team.create({ data: { name: 'Product Beta', createdById: managerUser!.id } });
    assert(!!teamA.id && !!teamB.id, '4. Two Teams created');

    // ── 3. Create Position + Stages ───────────────────────────────────────────
    const position = await PositionService.createPosition(hrUser.id, {
      title: 'Backend Engineer', department: 'Engineering', description: 'Node.js dev'
    });
    await prisma.position.update({ where: { id: position.id }, data: { status: PositionStatus.Open } });

    const stage1 = await StageService.createStage(hrUser.id, position.id, { name: 'Applied', sequenceOrder: 1 });
    const stage2 = await StageService.createStage(hrUser.id, position.id, { name: 'Interview Round 1', sequenceOrder: 2 });

    // Second position for cross-position rejection tests
    const otherPosition = await PositionService.createPosition(hrUser.id, {
      title: 'Designer', department: 'Design', description: 'UI design'
    });
    const otherStage = await StageService.createStage(hrUser.id, otherPosition.id, { name: 'Applied', sequenceOrder: 1 });

    // ── 4. Submit Application ─────────────────────────────────────────────────
    const submitted = await ApplicationService.submitApplication({
      name: 'Alice Applicant', email: 'alice@example.com', phone: '555-9999',
      resumeUrl: 'https://resume.example.com/alice', positionId: position.id
    });
    assert(!!submitted.id, '5. Application submitted successfully');
    const applicationId = submitted.id;

    // ═══════════════════════════════════════════════════════════════
    // TEAM ASSIGNMENT TESTS (1–10)
    // ═══════════════════════════════════════════════════════════════

    // Test 6 — HR assigns Team A
    const assigned = await TeamAssignmentService.assignTeam(hrUser.id, applicationId, { teamId: teamA.id });
    assert(assigned.assignedTeamId === teamA.id, '6. HR assigns Team A to Application');
    assert(assigned.assignedTeam?.id === teamA.id, '7. assignedTeamId updated correctly on returned Application');

    // Test 8 — Audit log
    const teamAudit = await prisma.auditLog.findFirst({
      where: { entityId: applicationId, actionType: 'APPLICATION_TEAM_ASSIGNED' }
    });
    assert(!!teamAudit && teamAudit.entityType === 'Application', '8. APPLICATION_TEAM_ASSIGNED audit log recorded');

    // Test 9 — Audit details
    const teamAuditDetails = JSON.parse(teamAudit!.details || '{}');
    assert(
      teamAuditDetails.oldTeamId === null && teamAuditDetails.newTeamId === teamA.id,
      '9. Audit details contain oldTeamId (null) and newTeamId'
    );

    // Test 10 — Reassignment
    const reassigned = await TeamAssignmentService.assignTeam(hrUser.id, applicationId, { teamId: teamB.id });
    assert(reassigned.assignedTeamId === teamB.id, '10. HR reassigns Application to Team B');

    // Test 11 — Reassignment audit has correct old team
    const reassignAudit = await prisma.auditLog.findFirst({
      where: { entityId: applicationId, actionType: 'APPLICATION_TEAM_ASSIGNED' },
      orderBy: { timestamp: 'desc' }
    });
    const reassignDetails = JSON.parse(reassignAudit!.details || '{}');
    assert(reassignDetails.oldTeamId === teamA.id && reassignDetails.newTeamId === teamB.id, '11. Reassignment audit captures oldTeamId correctly');

    // Test 12 — Unknown Application
    try {
      await TeamAssignmentService.assignTeam(hrUser.id, '00000000-0000-0000-0000-000000000000', { teamId: teamA.id });
      assert(false, '12. Unknown Application for team assign should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '12. Unknown Application returns 404');
    }

    // Test 13 — Unknown Team
    try {
      await TeamAssignmentService.assignTeam(hrUser.id, applicationId, { teamId: '00000000-0000-0000-0000-000000000000' });
      assert(false, '13. Unknown Team should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '13. Unknown Team returns 404');
    }

    // Test 14 — Invalid teamId (non-UUID) via schema
    const { assignTeamBodySchema } = await import('../schemas/team-assignment.schema');
    const badTeamId = assignTeamBodySchema.safeParse({ teamId: 'not-a-uuid' });
    assert(!badTeamId.success, '14. Non-UUID teamId rejected by Zod schema');

    // Test 15 — Zero partial update on failed assign
    const afterFailedAssign = await prisma.application.findUnique({ where: { id: applicationId } });
    assert(afterFailedAssign?.assignedTeamId === teamB.id, '15. Zero partial updates: assignedTeamId unchanged after failed assign');

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW CREATION TESTS (16–27)
    // ═══════════════════════════════════════════════════════════════

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

    const interview = await InterviewService.createInterview(hrUser.id, applicationId, {
      stageId:        stage2.id,
      scheduledAt:    futureDate,
      location:       'Conference Room A',
      meetingLink:    'https://meet.example.com/interview-1',
      interviewerIds: [teamLead1.id, hrUser.id]
    });

    assert(!!interview?.id, '16. HR creates Interview successfully');
    assert(interview?.createdById === hrUser.id, '17. createdById = hrUser.id');
    assert(interview?.status === InterviewStatus.Scheduled, '18. Interview status defaults to Scheduled');
    assert((interview?.assignments?.length ?? 0) === 2, '19. InterviewerAssignment rows created for both interviewers');

    // Test 20 — Audit log
    const interviewAudit = await prisma.auditLog.findFirst({
      where: { entityId: interview!.id, actionType: 'INTERVIEW_CREATED' }
    });
    assert(!!interviewAudit && interviewAudit.entityType === 'Interview', '20. INTERVIEW_CREATED audit log recorded');

    // Test 21 — Application not modified by interview creation
    const appAfterInterview = await prisma.application.findUnique({ where: { id: applicationId } });
    assert(appAfterInterview?.currentStageId === stage1.id, '21. Application.currentStageId unchanged after interview creation');
    assert(appAfterInterview?.status === 'InProgress', '22. Application.status unchanged after interview creation');

    // Test 23 — Wrong position stage rejected
    try {
      await InterviewService.createInterview(hrUser.id, applicationId, {
        stageId: otherStage.id, scheduledAt: futureDate, interviewerIds: [teamLead1.id]
      });
      assert(false, '23. Stage from wrong position should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('same position'), '23. Cross-position stage rejected with 400');
    }

    // Test 24 — Duplicate interviewerIds
    try {
      await InterviewService.createInterview(hrUser.id, applicationId, {
        stageId: stage2.id, scheduledAt: futureDate, interviewerIds: [teamLead1.id, teamLead1.id]
      });
      assert(false, '24. Duplicate interviewerIds should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('Duplicate'), '24. Duplicate interviewerIds rejected with 400');
    }

    // Test 25 — Unknown interviewer
    try {
      await InterviewService.createInterview(hrUser.id, applicationId, {
        stageId: stage2.id, scheduledAt: futureDate,
        interviewerIds: ['00000000-0000-0000-0000-000000000000']
      });
      assert(false, '25. Unknown interviewer should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '25. Unknown interviewer returns 404');
    }

    // Test 26 — Manager as interviewer rejected (invalid role)
    try {
      await InterviewService.createInterview(hrUser.id, applicationId, {
        stageId: stage2.id, scheduledAt: futureDate, interviewerIds: [managerUser!.id]
      });
      assert(false, '26. Manager as interviewer should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('invalid role'), '26. Manager interviewer rejected with 400 (invalid role)');
    }

    // Test 27 — scheduledAt in past rejected by Zod
    const { createInterviewSchema } = await import('../schemas/interview.schema');
    const pastDateParse = createInterviewSchema.safeParse({
      stageId: stage2.id,
      scheduledAt: new Date(Date.now() - 1000).toISOString(),
      interviewerIds: [teamLead1.id]
    });
    assert(!pastDateParse.success, '27. Past scheduledAt rejected by Zod schema');

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW READ TESTS (28–37)
    // ═══════════════════════════════════════════════════════════════

    const interviewId = interview!.id;

    // HR list
    const hrList = await InterviewService.listInterviews({ id: hrUser.id, role: Role.HR }, {});
    assert(hrList.length >= 1, '28. HR can list all interviews');

    // Manager list
    const managerList = await InterviewService.listInterviews({ id: managerUser!.id, role: Role.Manager }, {});
    assert(managerList.length >= 1, '29. Manager can list all interviews (read-only)');

    // HR detail
    const hrDetail = await InterviewService.getInterviewById({ id: hrUser.id, role: Role.HR }, interviewId);
    assert(hrDetail.id === interviewId, '30. HR can view interview detail');
    assert(
      !!(hrDetail.application && hrDetail.stage && hrDetail.assignments),
      '31. Detail includes application, stage, and assignments'
    );

    // Verify no passwordHash in detail
    const detailStr = JSON.stringify(hrDetail);
    assert(!detailStr.includes('passwordHash'), '32. Interview detail does NOT expose passwordHash');

    // Filter by applicationId
    const filteredByApp = await InterviewService.listInterviews(
      { id: hrUser.id, role: Role.HR },
      { applicationId }
    );
    assert(filteredByApp.length === 1 && filteredByApp[0].applicationId === applicationId, '33. Filter by applicationId returns correct interviews');

    // Filter by status
    const filteredByStatus = await InterviewService.listInterviews(
      { id: hrUser.id, role: Role.HR },
      { status: InterviewStatus.Scheduled }
    );
    assert(filteredByStatus.length >= 1, '34. Filter by status=Scheduled returns matching interviews');

    // TeamLead 1 (assigned) can list their interview
    const tl1List = await InterviewService.listInterviews({ id: teamLead1.id, role: Role.TeamLead }, {});
    assert(tl1List.length === 1 && tl1List[0].id === interviewId, '35. Assigned TeamLead sees their own interview in list');

    // TeamLead 2 (not assigned) sees empty list
    const tl2List = await InterviewService.listInterviews({ id: teamLead2.id, role: Role.TeamLead }, {});
    assert(tl2List.length === 0, '36. Unassigned TeamLead sees empty list (not others\' interviews)');

    // TeamLead 1 can view detail of assigned interview
    const tl1Detail = await InterviewService.getInterviewById({ id: teamLead1.id, role: Role.TeamLead }, interviewId);
    assert(tl1Detail.id === interviewId, '37. Assigned TeamLead can view interview detail');

    // TeamLead 2 blocked from detail of unassigned interview
    try {
      await InterviewService.getInterviewById({ id: teamLead2.id, role: Role.TeamLead }, interviewId);
      assert(false, '38. Unassigned TeamLead should be blocked from interview detail');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '38. Unassigned TeamLead receives 403 on interview detail');
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW UPDATE TESTS (39–43)
    // ═══════════════════════════════════════════════════════════════

    const newSchedule = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks out
    const updatedSchedule = await InterviewService.updateInterview(hrUser.id, interviewId, {
      scheduledAt: newSchedule
    });
    assert(
      updatedSchedule?.scheduledAt?.getTime() === newSchedule.getTime(),
      '39. HR reschedules Interview (scheduledAt updated)'
    );

    const updatedLocation = await InterviewService.updateInterview(hrUser.id, interviewId, {
      location: 'Conference Room B'
    });
    assert(updatedLocation?.location === 'Conference Room B', '40. HR updates location');

    const updatedLink = await InterviewService.updateInterview(hrUser.id, interviewId, {
      meetingLink: 'https://meet.example.com/interview-updated'
    });
    assert(updatedLink?.meetingLink === 'https://meet.example.com/interview-updated', '41. HR updates meetingLink');

    const updateAudit = await prisma.auditLog.findFirst({
      where: { entityId: interviewId, actionType: 'INTERVIEW_UPDATED' }
    });
    assert(!!updateAudit, '42. INTERVIEW_UPDATED audit log recorded');

    // Empty update body rejected by Zod
    const { updateInterviewSchema } = await import('../schemas/interview.schema');
    const emptyBody = updateInterviewSchema.safeParse({});
    assert(!emptyBody.success, '43. Empty update body rejected by Zod schema');

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEW STATUS TESTS (44–50)
    // ═══════════════════════════════════════════════════════════════

    const completedInterview = await InterviewService.updateInterviewStatus(
      hrUser.id, interviewId, { status: InterviewStatus.Completed }
    );
    assert(completedInterview?.status === InterviewStatus.Completed, '44. HR sets Interview status to Completed');

    const statusAudit = await prisma.auditLog.findFirst({
      where: { entityId: interviewId, actionType: 'INTERVIEW_STATUS_CHANGED' }
    });
    assert(!!statusAudit, '45. INTERVIEW_STATUS_CHANGED audit log recorded');

    const statusAuditDetails = JSON.parse(statusAudit!.details || '{}');
    assert(
      statusAuditDetails.oldStatus === InterviewStatus.Scheduled &&
      statusAuditDetails.newStatus === InterviewStatus.Completed,
      '46. INTERVIEW_STATUS_CHANGED audit details contain oldStatus and newStatus'
    );

    // Application fields unchanged
    const appAfterStatusChange = await prisma.application.findUnique({ where: { id: applicationId } });
    assert(appAfterStatusChange?.currentStageId === stage1.id, '47. Application.currentStageId unchanged after interview status change');
    assert(appAfterStatusChange?.status === 'InProgress', '48. Application.status unchanged after interview status change');

    const cancelledInterview = await InterviewService.updateInterviewStatus(
      hrUser.id, interviewId, { status: InterviewStatus.Cancelled }
    );
    assert(cancelledInterview?.status === InterviewStatus.Cancelled, '49. HR sets Interview status to Cancelled');

    // Invalid status via Zod
    const { updateInterviewStatusSchema } = await import('../schemas/interview.schema');
    const badStatus = updateInterviewStatusSchema.safeParse({ status: 'INVALID_STATUS' });
    assert(!badStatus.success, '50. Invalid InterviewStatus rejected by Zod schema');

    // ═══════════════════════════════════════════════════════════════
    // INTERVIEWER REPLACEMENT TESTS (51–56)
    // ═══════════════════════════════════════════════════════════════

    const replacedInterviewers = await InterviewService.updateInterviewers(
      hrUser.id, interviewId, { interviewerIds: [teamLead2.id] }
    );
    assert(!!(replacedInterviewers), '51. HR replaces interviewers successfully');

    const newAssignments = await prisma.interviewerAssignment.findMany({
      where: { interviewId }
    });
    assert(newAssignments.length === 1 && newAssignments[0].interviewerId === teamLead2.id, '52. Old assignments deleted and new assignment created');

    const interviewersAudit = await prisma.auditLog.findFirst({
      where: { entityId: interviewId, actionType: 'INTERVIEW_INTERVIEWERS_UPDATED' }
    });
    assert(!!interviewersAudit, '53. INTERVIEW_INTERVIEWERS_UPDATED audit log recorded');

    // Duplicate ID in replacement
    try {
      await InterviewService.updateInterviewers(hrUser.id, interviewId, {
        interviewerIds: [teamLead1.id, teamLead1.id]
      });
      assert(false, '54. Duplicate interviewerIds in replacement should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('Duplicate'), '54. Duplicate interviewerIds in replacement rejected with 400');
    }

    // Unknown interviewer in replacement
    try {
      await InterviewService.updateInterviewers(hrUser.id, interviewId, {
        interviewerIds: ['00000000-0000-0000-0000-000000000000']
      });
      assert(false, '55. Unknown interviewer in replacement should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '55. Unknown interviewer in replacement returns 404');
    }

    // Manager as replacement interviewer rejected
    try {
      await InterviewService.updateInterviewers(hrUser.id, interviewId, {
        interviewerIds: [managerUser!.id]
      });
      assert(false, '56. Manager as replacement interviewer should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('invalid role'), '56. Manager as replacement interviewer rejected with 400');
    }

    // ═══════════════════════════════════════════════════════════════
    // SECURITY (57–60)
    // ═══════════════════════════════════════════════════════════════

    const secDetail = await InterviewService.getInterviewById({ id: hrUser.id, role: Role.HR }, interviewId);
    const secStr = JSON.stringify(secDetail);
    assert(!secStr.includes('passwordHash'), '57. Interview detail does NOT expose passwordHash anywhere');
    assert(!secStr.includes('DATABASE_URL'), '58. Interview detail does NOT contain DATABASE_URL or env secrets');

    // Audit details do NOT contain candidate personal data
    const createdAuditDetails = JSON.parse(interviewAudit!.details || '{}');
    assert(
      !JSON.stringify(createdAuditDetails).includes('alice@example.com') &&
      !JSON.stringify(createdAuditDetails).includes('Alice Applicant'),
      '59. INTERVIEW_CREATED audit details do NOT contain candidate personal data'
    );

    // Verify audit log for team assignment contains no personal data
    const teamAuditStr = JSON.stringify(teamAuditDetails);
    assert(
      !teamAuditStr.includes('alice@example.com') && !teamAuditStr.includes('Alice'),
      '60. APPLICATION_TEAM_ASSIGNED audit details contain no candidate personal data'
    );

    console.log('\n======================================================================');
    console.log(`TEAM ASSIGNMENT + INTERVIEW MANAGEMENT SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    // Cleanup — respects FK dependency order
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

runTeamInterviewTests();
