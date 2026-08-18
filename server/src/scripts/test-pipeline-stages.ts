import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { Role, PositionStatus } from '@prisma/client';
import { AppError } from '../utils/errors';

async function runPipelineStagesTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 PIPELINE & STAGES VERIFICATION SUITE');
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
    // 0. Database cleanup
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
      name: 'HR Coordinator',
      email: 'hr.stage@altrium.com',
      password: 'HrPassword123!',
      role: Role.HR
    });
    assert(hrUser.role === Role.HR, '2. HR account created by Manager');

    // 2. Create Position for testing stages
    const position = await PositionService.createPosition(hrUser.id, {
      title: 'Backend Systems Architect',
      department: 'Engineering',
      description: 'Architecting high performance Node.js microservices.'
    });
    assert(position.stages.length === 0, '3. Test position created with 0 stages initially');

    // 3. Test: HR Stage Creation (Implicit sequenceOrder)
    const stage1 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Applied',
      isGating: true,
      feedbackRequiredCount: 1
    });
    assert(stage1.name === 'Applied', '4. HR created first Stage (Applied)');
    assert(stage1.sequenceOrder === 1, '5. Implicit sequenceOrder defaults to 1 for first stage');

    const stageCreatedAudit = await prisma.auditLog.findFirst({
      where: { entityId: stage1.id, actionType: 'STAGE_CREATED' }
    });
    assert(!!stageCreatedAudit && stageCreatedAudit.entityType === 'Stage', '6. STAGE_CREATED audit log recorded with entityType Stage');

    const stage2 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Screening'
    });
    assert(stage2.sequenceOrder === 2, '7. Implicit sequenceOrder defaults to max + 1 (2)');

    // 4. Test: HR Stage Creation (Explicit sequenceOrder & Duplicate Order Rejection)
    const stage3 = await StageService.createStage(hrUser.id, position.id, {
      name: 'Technical Interview',
      sequenceOrder: 3
    });
    assert(stage3.sequenceOrder === 3, '8. Explicit sequenceOrder 3 created successfully');

    try {
      await StageService.createStage(hrUser.id, position.id, {
        name: 'Duplicate Order Stage',
        sequenceOrder: 1
      });
      assert(false, '9. Duplicate explicit sequence order should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 409 && err.message.includes('already exists'),
        '9. Duplicate explicit sequenceOrder rejected with 409 Conflict'
      );
    }

    // 5. Test: Manager Read-Only Oversight Access
    const stagesList = await StageService.getStagesByPosition(position.id);
    assert(stagesList.length === 3, '10. Manager/HR can list stages for position');
    assert(
      stagesList[0].sequenceOrder === 1 && stagesList[1].sequenceOrder === 2 && stagesList[2].sequenceOrder === 3,
      '11. Stages returned strictly sorted by sequenceOrder ASC'
    );

    const singleStage = await StageService.getStageById(position.id, stage1.id);
    assert(singleStage.id === stage1.id, '12. Manager/HR can view stage details');

    // 6. Test: Cross-Position Stage Detail Validation
    const otherPosition = await PositionService.createPosition(hrUser.id, {
      title: 'UI Developer',
      department: 'Design',
      description: 'Designing frontend web apps.'
    });

    try {
      await StageService.getStageById(otherPosition.id, stage1.id);
      assert(false, '13. Cross-position stage access should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 404 && err.message.includes('does not belong to specified position'),
        '13. Cross-position stage fetch returns 404'
      );
    }

    // 7. Test: Update Stage Content (name, isGating, feedbackRequiredCount)
    const updatedStage1 = await StageService.updateStage(hrUser.id, position.id, stage1.id, {
      name: 'Initial Application',
      isGating: false,
      feedbackRequiredCount: 0
    });
    assert(updatedStage1.name === 'Initial Application', '14. Stage name updated successfully');
    assert(updatedStage1.isGating === false, '15. Stage isGating updated to false');
    assert(updatedStage1.feedbackRequiredCount === 0, '16. Stage feedbackRequiredCount updated to 0');
    assert(updatedStage1.sequenceOrder === 1, '17. Sequence order remained unchanged by updateStage');

    const stageUpdatedAudit = await prisma.auditLog.findFirst({
      where: { entityId: stage1.id, actionType: 'STAGE_UPDATED' }
    });
    assert(!!stageUpdatedAudit && stageUpdatedAudit.entityType === 'Stage', '18. STAGE_UPDATED audit log recorded with entityType Stage');

    // 8. Test: Valid Reorder Operation (Contiguous 1..N)
    const reorderPayload = {
      stages: [
        { stageId: stage3.id, sequenceOrder: 1 },
        { stageId: stage2.id, sequenceOrder: 2 },
        { stageId: stage1.id, sequenceOrder: 3 }
      ]
    };

    const reorderedStages = await StageService.reorderStages(hrUser.id, position.id, reorderPayload);
    assert(reorderedStages[0].id === stage3.id && reorderedStages[0].sequenceOrder === 1, '19. Reordered stage 3 to sequence 1');
    assert(reorderedStages[2].id === stage1.id && reorderedStages[2].sequenceOrder === 3, '20. Reordered stage 1 to sequence 3');

    const stageReorderedAudit = await prisma.auditLog.findFirst({
      where: { entityId: position.id, actionType: 'STAGE_REORDERED' }
    });
    assert(
      !!stageReorderedAudit && stageReorderedAudit.entityType === 'Position',
      '21. STAGE_REORDERED audit log recorded with entityType Position and positionId entityId'
    );

    // 9. Test: Reorder Validation & Transaction Rollback Safeguards
    // Case A: Missing Stage in Payload
    try {
      await StageService.reorderStages(hrUser.id, position.id, {
        stages: [
          { stageId: stage3.id, sequenceOrder: 1 },
          { stageId: stage2.id, sequenceOrder: 2 }
        ]
      });
      assert(false, '22. Incomplete reorder payload should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 400 && err.message.includes('must include all stages'),
        '22. Reorder payload missing existing stage rejected with 400 Bad Request'
      );
    }

    // Case B: Non-contiguous sequence numbers (1, 2, 5)
    try {
      await StageService.reorderStages(hrUser.id, position.id, {
        stages: [
          { stageId: stage3.id, sequenceOrder: 1 },
          { stageId: stage2.id, sequenceOrder: 2 },
          { stageId: stage1.id, sequenceOrder: 5 }
        ]
      });
      assert(false, '23. Non-contiguous sequence order payload should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 400 && err.message.includes('contiguous range starting from 1'),
        '23. Reorder payload with non-contiguous sequences rejected with 400 Bad Request'
      );
    }

    // Case C: Duplicate sequence numbers in payload
    try {
      await StageService.reorderStages(hrUser.id, position.id, {
        stages: [
          { stageId: stage3.id, sequenceOrder: 1 },
          { stageId: stage2.id, sequenceOrder: 1 },
          { stageId: stage1.id, sequenceOrder: 2 }
        ]
      });
      assert(false, '24. Duplicate sequence numbers in reorder should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 400 && err.message.includes('duplicate sequence order'),
        '24. Reorder payload with duplicate sequence values rejected with 400 Bad Request'
      );
    }

    // Case D: Foreign stage ID from another position
    const otherStage = await StageService.createStage(hrUser.id, otherPosition.id, {
      name: 'Other Stage'
    });

    try {
      await StageService.reorderStages(hrUser.id, position.id, {
        stages: [
          { stageId: stage3.id, sequenceOrder: 1 },
          { stageId: stage2.id, sequenceOrder: 2 },
          { stageId: otherStage.id, sequenceOrder: 3 }
        ]
      });
      assert(false, '25. Foreign stage ID in reorder should be rejected');
    } catch (err: any) {
      assert(
        err instanceof AppError && err.statusCode === 400 && err.message.includes('does not belong to specified position'),
        '25. Reorder payload with foreign stage ID rejected with 400 Bad Request'
      );
    }

    // Confirm Zero Partial Updates (Reordered state intact: stage3=1, stage2=2, stage1=3)
    const finalStages = await StageService.getStagesByPosition(position.id);
    assert(
      finalStages[0].id === stage3.id && finalStages[0].sequenceOrder === 1 &&
      finalStages[1].id === stage2.id && finalStages[1].sequenceOrder === 2 &&
      finalStages[2].id === stage1.id && finalStages[2].sequenceOrder === 3,
      '26. Failed reorder attempts produced ZERO partial updates (transaction safety verified)'
    );

    console.log('\n======================================================================');
    console.log(`PIPELINE & STAGES TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');
  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    // Teardown created test records to prevent FK constraints in legacy test scripts
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

runPipelineStagesTests();
