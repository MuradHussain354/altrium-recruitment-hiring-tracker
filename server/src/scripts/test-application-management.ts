import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationManagementService } from '../services/application-management.service';
import { ApplicationService } from '../services/application.service';
import { Role, PositionStatus, ApplicationStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runApplicationManagementTests() {
  // Production safeguard — must be the first executable line before any DB operations
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 APPLICATION MANAGEMENT VERIFICATION SUITE');
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
    // ── 0. Full database teardown ─────────────────────────────────────────────
    await prisma.feedbackCriterionScore.deleteMany({});
    await prisma.feedback.deleteMany({});
    await prisma.interviewerAssignment.deleteMany({});
    await prisma.interview.deleteMany({});
    await prisma.application.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.stage.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});

    // ── 1. Bootstrap users ───────────────────────────────────────────────────
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerUser, '1. System Manager bootstrapped');

    const hrUser = await UserService.createManagedUser(managerUser!.id, {
      name:     'HR Internal',
      email:    'hr.internal@altrium.com',
      password: 'HrPassword123!',
      role:     Role.HR
    });
    assert(hrUser.role === Role.HR, '2. HR account created');

    const teamLeadUser = await UserService.createManagedUser(managerUser!.id, {
      name:     'Team Lead',
      email:    'teamlead@altrium.com',
      password: 'TlPassword123!',
      role:     Role.TeamLead
    });
    assert(teamLeadUser.role === Role.TeamLead, '3. TeamLead account created');

    // ── 2. Create Position + Stages ──────────────────────────────────────────
    const position = await PositionService.createPosition(hrUser.id, {
      title:       'Senior Backend Engineer',
      department:  'Engineering',
      description: 'Node.js microservices development'
    });

    const stage1 = await StageService.createStage(hrUser.id, position.id, { name: 'Applied',    sequenceOrder: 1, isGating: false });
    const stage2 = await StageService.createStage(hrUser.id, position.id, { name: 'Screening',  sequenceOrder: 2, isGating: false });
    const stage3 = await StageService.createStage(hrUser.id, position.id, { name: 'Interview',  sequenceOrder: 3, isGating: false });

    // Open position so public application can be submitted
    await prisma.position.update({
      where: { id: position.id },
      data:  { status: PositionStatus.Open }
    });

    // Create second position with its own stage for cross-position rejection tests
    const otherPosition = await PositionService.createPosition(hrUser.id, {
      title:       'UI Designer',
      department:  'Design',
      description: 'UI/UX design'
    });
    const otherStage = await StageService.createStage(hrUser.id, otherPosition.id, { name: 'Applied', sequenceOrder: 1 });

    // ── 3. Submit a public application ──────────────────────────────────────
    const submittedApp = await ApplicationService.submitApplication({
      name:       'John Candidate',
      email:      'john.candidate@email.com',
      phone:      '555-1234',
      resumeUrl:  'https://resume.example.com/john',
      positionId: position.id
    });
    assert(!!submittedApp.id, '4. Public application submitted successfully for test data');

    const applicationId = submittedApp.id;

    // ═══════════════════════════════════════════════════════════════
    // READ TESTS
    // ═══════════════════════════════════════════════════════════════

    const appList = await ApplicationManagementService.listApplications({});
    assert(appList.length >= 1, '5. HR can list applications');
    assert(
      !!(appList[0].candidate && appList[0].position && appList[0].currentStage !== undefined),
      '6. List response includes candidate, position, currentStage fields'
    );

    // Manager read-only list (service-level — RBAC enforcement tested at HTTP layer in other suites)
    const managerList = await ApplicationManagementService.listApplications({});
    assert(managerList.length >= 1, '7. Manager can list applications (service level)');

    const detail = await ApplicationManagementService.getApplicationById(applicationId);
    assert(detail.id === applicationId, '8. HR can view application detail');
    assert(
      !!(detail.candidate && detail.position && detail.currentStage),
      '9. Detail response includes candidate, position, and currentStage'
    );

    // Unknown application
    try {
      await ApplicationManagementService.getApplicationById('00000000-0000-0000-0000-000000000000');
      assert(false, '10. Unknown applicationId should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '10. Unknown applicationId returns 404');
    }

    // ═══════════════════════════════════════════════════════════════
    // FILTER TESTS
    // ═══════════════════════════════════════════════════════════════

    const filteredByPosition = await ApplicationManagementService.listApplications({ positionId: position.id });
    assert(filteredByPosition.length === 1 && filteredByPosition[0].positionId === position.id, '11. Filter by positionId returns matching applications');

    const filteredByStage = await ApplicationManagementService.listApplications({ stageId: stage1.id });
    assert(filteredByStage.length === 1 && filteredByStage[0].currentStageId === stage1.id, '12. Filter by stageId returns matching applications');

    const filteredByStatus = await ApplicationManagementService.listApplications({ status: ApplicationStatus.InProgress });
    assert(filteredByStatus.length >= 1, '13. Filter by status=InProgress returns matching applications');

    const filteredByNameSearch = await ApplicationManagementService.listApplications({ search: 'John' });
    assert(filteredByNameSearch.length >= 1 && filteredByNameSearch[0].candidate.name.includes('John'), '14. Filter by search (partial name) returns matching applications');

    const filteredByEmailSearch = await ApplicationManagementService.listApplications({ search: 'john.candidate' });
    assert(filteredByEmailSearch.length >= 1, '15. Filter by search (partial email) returns matching applications');

    const noMatchFilter = await ApplicationManagementService.listApplications({ positionId: '00000000-0000-0000-0000-000000000099' });
    assert(Array.isArray(noMatchFilter) && noMatchFilter.length === 0, '16. Non-matching filter returns empty array, not 404');

    // ═══════════════════════════════════════════════════════════════
    // STAGE CHANGE TESTS
    // ═══════════════════════════════════════════════════════════════

    const beforeStageChange = await ApplicationManagementService.getApplicationById(applicationId);
    const beforeStageId = beforeStageChange.currentStageId;

    const movedApp = await ApplicationManagementService.moveApplicationStage(
      hrUser.id,
      applicationId,
      { stageId: stage2.id }
    );
    assert(movedApp.currentStageId === stage2.id, '17. HR moves application to valid stage in same position');
    assert(movedApp.currentStageId !== beforeStageId, '18. currentStageId is updated correctly after stage move');

    // Verify audit log written inside transaction
    const stageChangedAudit = await prisma.auditLog.findFirst({
      where: { entityId: applicationId, actionType: 'APPLICATION_STAGE_CHANGED' }
    });
    assert(!!stageChangedAudit && stageChangedAudit.entityType === 'Application', '19. APPLICATION_STAGE_CHANGED audit log recorded');

    const stageAuditDetails = JSON.parse(stageChangedAudit!.details || '{}');
    assert(
      stageAuditDetails.oldStageId === beforeStageId && stageAuditDetails.newStageId === stage2.id,
      '20. APPLICATION_STAGE_CHANGED audit details contain oldStageId and newStageId'
    );

    // Same-stage no-op guard
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, applicationId, { stageId: stage2.id });
      assert(false, '21. Moving to same stage should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('already at the specified stage'), '21. Moving to same stage rejected with 400');
    }

    // Cross-position stage rejection
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, applicationId, { stageId: otherStage.id });
      assert(false, '22. Stage from a different Position should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400 && err.message.includes('same position'), '22. Cross-position stage move rejected with 400');
    }

    // Verify zero partial updates after failed cross-position attempt
    const afterFailedMove = await ApplicationManagementService.getApplicationById(applicationId);
    assert(afterFailedMove.currentStageId === stage2.id, '23. Zero partial updates: stage unchanged after failed cross-position attempt');

    // Unknown stage
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, applicationId, { stageId: '00000000-0000-0000-0000-000000000000' });
      assert(false, '24. Unknown stageId should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '24. Unknown stageId rejected with 404');
    }

    // Unknown application for stage change
    try {
      await ApplicationManagementService.moveApplicationStage(hrUser.id, '00000000-0000-0000-0000-000000000000', { stageId: stage3.id });
      assert(false, '25. Unknown applicationId for stage change should be rejected');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '25. Unknown applicationId for stage change rejected with 404');
    }

    // ═══════════════════════════════════════════════════════════════
    // STATUS CHANGE TESTS
    // ═══════════════════════════════════════════════════════════════

    const stageBeforeStatusChange = (await ApplicationManagementService.getApplicationById(applicationId)).currentStageId;

    // Set to Rejected with statusReason
    const rejectedApp = await ApplicationManagementService.updateApplicationStatus(
      hrUser.id,
      applicationId,
      { status: ApplicationStatus.Rejected, statusReason: 'Does not meet required experience level.' }
    );
    assert(rejectedApp.status === ApplicationStatus.Rejected, '26. HR sets application status to Rejected');
    assert(rejectedApp.statusReason === 'Does not meet required experience level.', '27. statusReason stored correctly on Application record');
    assert(rejectedApp.currentStageId === stageBeforeStatusChange, '28. currentStageId unchanged after status update (stage/status independence)');

    // Verify audit log written inside transaction
    const statusChangedAudit = await prisma.auditLog.findFirst({
      where: { entityId: applicationId, actionType: 'APPLICATION_STATUS_CHANGED' }
    });
    assert(!!statusChangedAudit && statusChangedAudit.entityType === 'Application', '29. APPLICATION_STATUS_CHANGED audit log recorded');

    const statusAuditDetails = JSON.parse(statusChangedAudit!.details || '{}');
    assert(
      statusAuditDetails.oldStatus === ApplicationStatus.InProgress && statusAuditDetails.newStatus === ApplicationStatus.Rejected,
      '30. APPLICATION_STATUS_CHANGED audit details contain oldStatus and newStatus'
    );
    assert(
      !('statusReason' in statusAuditDetails),
      '31. APPLICATION_STATUS_CHANGED audit details do NOT contain statusReason (avoids duplication of sensitive free-text)'
    );

    // Set to Hired
    const hiredApp = await ApplicationManagementService.updateApplicationStatus(
      hrUser.id, applicationId, { status: ApplicationStatus.Hired }
    );
    assert(hiredApp.status === ApplicationStatus.Hired, '32. HR sets application status to Hired');

    // Set to OnHold
    const onHoldApp = await ApplicationManagementService.updateApplicationStatus(
      hrUser.id, applicationId, { status: ApplicationStatus.OnHold }
    );
    assert(onHoldApp.status === ApplicationStatus.OnHold, '33. HR sets application status to OnHold');

    // Restore to InProgress
    const restoredApp = await ApplicationManagementService.updateApplicationStatus(
      hrUser.id, applicationId, { status: ApplicationStatus.InProgress }
    );
    assert(restoredApp.status === ApplicationStatus.InProgress, '34. HR restores application status to InProgress');
    assert(restoredApp.statusReason === null, '35. statusReason cleared to null when omitted on restore');

    // Invalid status — tested by Zod, but verify service-level with bad enum would be caught before service call
    // We trust Zod at the schema level; we verify the schema rejects it:
    const badStatusParse = (await import('../schemas/application-management.schema')).changeStatusSchema.safeParse({ status: 'INVALID_STATUS' });
    assert(!badStatusParse.success, '36. Invalid status value rejected by Zod schema');

    // statusReason too long
    const longReasonParse = (await import('../schemas/application-management.schema')).changeStatusSchema.safeParse({
      status: ApplicationStatus.Rejected,
      statusReason: 'x'.repeat(501)
    });
    assert(!longReasonParse.success, '37. statusReason > 500 chars rejected by Zod schema');

    // ═══════════════════════════════════════════════════════════════
    // SECURITY TEST
    // ═══════════════════════════════════════════════════════════════

    const detailForSecurity = await ApplicationManagementService.getApplicationById(applicationId);
    const detailStr = JSON.stringify(detailForSecurity);
    assert(!detailStr.includes('passwordHash'), '38. Application detail response does NOT contain passwordHash');

    console.log('\n======================================================================');
    console.log(`APPLICATION MANAGEMENT TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');

  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    // Teardown: remove all test records to prevent FK constraint issues in other suites
    try {
      await prisma.feedbackCriterionScore.deleteMany({});
      await prisma.feedback.deleteMany({});
      await prisma.interviewerAssignment.deleteMany({});
      await prisma.interview.deleteMany({});
      await prisma.application.deleteMany({});
      await prisma.candidate.deleteMany({});
      await prisma.stage.deleteMany({});
      await prisma.position.deleteMany({});
    } catch (_) {}
    await prisma.$disconnect();
  }
}

runApplicationManagementTests();
