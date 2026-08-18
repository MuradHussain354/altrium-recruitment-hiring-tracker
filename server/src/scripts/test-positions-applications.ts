import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { PositionService } from '../services/position.service';
import { ApplicationService } from '../services/application.service';
import { Role, PositionStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runPositionsApplicationsTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 POSITIONS & PUBLIC APPLICATIONS VERIFICATION SUITE');
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
    // 0. Clean up test database tables
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

    // 1. Bootstrap System Manager and HR users
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerUser, '1. System Manager bootstrapped');

    const hrUser = await UserService.createManagedUser(managerUser!.id, {
      name: 'HR Lead',
      email: 'hr.lead@altrium.com',
      password: 'HrPassword123!',
      role: Role.HR
    });
    assert(hrUser.role === Role.HR, '2. HR user account created by Manager');

    // 2. Test: Position Creation by HR (NO Automatic Default Stage Records)
    const posInput = {
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      description: 'Lead engineering projects using React, Node.js, TypeScript, and PostgreSQL.',
      requiredSkills: 'React, Node.js, TypeScript, PostgreSQL',
      headcount: 2
    };

    const createdPosition = await PositionService.createPosition(hrUser.id, posInput);
    assert(createdPosition.title === posInput.title, '3. HR created position successfully');
    assert(createdPosition.status === PositionStatus.Draft, '4. Position status defaults to Draft');
    assert(createdPosition.stages.length === 0, '5. Position created with NO automatic Stage records (no invented pipeline)');

    // 3. Test: AuditLog Generation for Position Creation
    const createAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdPosition.id, actionType: 'POSITION_CREATED' }
    });
    assert(!!createAudit && createAudit.actorId === hrUser.id, '6. POSITION_CREATED audit log generated with HR actorId');

    // 4. Test: Update Position Content & Status (HR Only)
    const updatedPos = await PositionService.updatePosition(hrUser.id, createdPosition.id, {
      description: 'Updated description for Senior Full Stack Engineer role.'
    });
    assert(updatedPos.description.includes('Updated description'), '7. HR updated position content successfully');

    const openPos = await PositionService.updatePositionStatus(hrUser.id, createdPosition.id, PositionStatus.Open);
    assert(openPos.status === PositionStatus.Open, '8. HR updated position status to Open');

    const statusAudit = await prisma.auditLog.findFirst({
      where: { entityId: createdPosition.id, actionType: 'POSITION_STATUS_CHANGED' }
    });
    assert(!!statusAudit, '9. POSITION_STATUS_CHANGED audit log generated');

    // 5. Test: Manager Read-Only Oversight Access
    const managerView = await PositionService.getPositionById(createdPosition.id);
    assert(managerView.id === createdPosition.id, '10. Manager can view position details (read-only oversight)');

    // 6. Test: Public Careers Filtering (Draft positions hidden, Open positions visible)
    const draftPos = await PositionService.createPosition(hrUser.id, {
      title: 'Internal Confidential Role',
      department: 'Executive',
      description: 'Confidential executive role in planning phase.'
    });

    const publicList = await PositionService.getPublicPositions();
    assert(publicList.some((p) => p.id === openPos.id), '11. Public positions list includes Open position');
    assert(!publicList.some((p) => p.id === draftPos.id), '12. Public positions list EXCLUDES Draft position');

    try {
      await PositionService.getPublicPositionById(draftPos.id);
      assert(false, '13. Public detail view should reject Draft position');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 404, '13. Public detail view returns 404 for non-Open position');
    }

    // 7. Test: Application to Open Position With NO Stage Safe Rejection
    const appCandidateInput = {
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
      phone: '+1555019923',
      resumeUrl: 'https://example.com/resumes/alice.pdf',
      source: 'Direct' as const,
      positionId: openPos.id
    };

    try {
      await ApplicationService.submitApplication(appCandidateInput);
      assert(false, '14. Application to Open position with NO stage should fail safely');
    } catch (err: any) {
      assert(
        err instanceof AppError &&
          err.statusCode === 400 &&
          err.message.includes('not yet configured to accept applications'),
        '14. Application to Open position with NO stage safely rejected with 400 error'
      );
    }

    // Confirm no incomplete Application or Candidate record left behind
    const orphanAppCount = await prisma.application.count({ where: { positionId: openPos.id } });
    assert(orphanAppCount === 0, '15. No orphan Application records created during safe rejection');

    // 8. Test: Configure Stages and Successful Candidate Application Submission
    const initialStage = await prisma.stage.create({
      data: {
        positionId: openPos.id,
        name: 'Applied',
        sequenceOrder: 1,
        isGating: true
      }
    });

    await prisma.stage.create({
      data: {
        positionId: openPos.id,
        name: 'Technical Screening',
        sequenceOrder: 2,
        isGating: true
      }
    });

    const submittedApp = await ApplicationService.submitApplication(appCandidateInput);
    assert(!!submittedApp.id, '16. Candidate application submitted successfully');
    assert(submittedApp.currentStageId === initialStage.id, '17. Initial stage assigned to lowest sequenceOrder stage (Applied)');
    assert(submittedApp.status === 'InProgress', '18. Application status initialized to InProgress');
    assert(submittedApp.candidate.email === 'alice.johnson@example.com', '19. Candidate record created and linked');

    // 9. Test: Candidate Reuse & Identity Preservation
    // Create a second Open position with a valid stage
    const secondPos = await PositionService.createPosition(hrUser.id, {
      title: 'DevOps Lead',
      department: 'Infrastructure',
      description: 'Lead DevOps and cloud infrastructure engineering.'
    });
    await PositionService.updatePositionStatus(hrUser.id, secondPos.id, PositionStatus.Open);
    await prisma.stage.create({
      data: {
        positionId: secondPos.id,
        name: 'Application Received',
        sequenceOrder: 1
      }
    });

    // Alice applies to second position with updated form data (different phone and name)
    const aliceSecondApp = await ApplicationService.submitApplication({
      name: 'Alice J. Modified',
      email: 'ALICE.JOHNSON@EXAMPLE.COM', // Test case-insensitive email normalization
      phone: '+1999999999',
      resumeUrl: 'https://example.com/resumes/alice_new.pdf',
      source: 'Referral',
      positionId: secondPos.id
    });

    const candidateRecord = await prisma.candidate.findUnique({ where: { id: submittedApp.candidateId } });
    assert(aliceSecondApp.candidateId === submittedApp.candidateId, '20. Existing Candidate identity reused across applications');
    assert(candidateRecord?.name === 'Alice Johnson', '21. Existing Candidate profile fields PRESERVED (not overwritten)');
    assert(candidateRecord?.phone === '+1555019923', '22. Existing Candidate phone preserved');

    // 10. Test: Duplicate Application Rejection
    try {
      await ApplicationService.submitApplication({
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        positionId: openPos.id
      });
      assert(false, '23. Duplicate application should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 409 && err.message.includes('already applied'),
        '23. Duplicate candidate application rejected with 409 Conflict'
      );
    }

    // 11. Test: Closed Position Application Rejection
    await PositionService.updatePositionStatus(hrUser.id, openPos.id, PositionStatus.Closed);
    try {
      await ApplicationService.submitApplication({
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        positionId: openPos.id
      });
      assert(false, '24. Closed position application should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 400 && err.message.includes('not open for applications'),
        '24. Closed position application safely rejected with 400 Bad Request'
      );
    }

    console.log('\n======================================================================');
    console.log(`POSITIONS & APPLICATIONS TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');
  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    // Clean up created test entities to prevent FK conflicts in legacy test scripts
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

runPositionsApplicationsTests();
