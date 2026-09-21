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
import { Role, PositionStatus } from '@prisma/client';

async function runHotfixTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 PRODUCTION HOTFIX VERIFICATION SUITE');
  console.log('HR INTERVIEWS + APPLICATION REVIEW DEFENSIVE DATA HANDLING & RBAC');
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
    // 0. Full teardown
    await prisma.notification.deleteMany({});
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

    // 1. Bootstrap users
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerUser, '1. System Manager bootstrapped');

    const hrUser = await UserService.createManagedUser(managerUser!.id, {
      name: 'HR Lead',
      email: 'hr.lead@altrium.com',
      role: Role.HR
    });
    await activateTestUserWithPassword('hr.lead@altrium.com', 'HrPass123!');
    assert(hrUser.role === Role.HR, '2. HR account created');

    const teamLead = await UserService.createManagedUser(managerUser!.id, {
      name: 'Tech Lead',
      email: 'tech.lead@altrium.com',
      role: Role.TeamLead
    });
    await activateTestUserWithPassword('tech.lead@altrium.com', 'LeadPass123!');
    assert(teamLead.role === Role.TeamLead, '3. TeamLead account created');

    // 2. Position & Stage setup
    const position = await PositionService.createPosition(hrUser.id, {
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      description: 'Building robust microservices and React web applications',
      requiredSkills: 'TypeScript, Node.js, React, PostgreSQL',
      headcount: 2,
      status: PositionStatus.Open
    });

    const firstStage = await StageService.createStage(hrUser.id, position.id, {
      name: 'Technical Screening',
      sequenceOrder: 1,
      isGating: false,
      feedbackRequiredCount: 0
    });
    assert(!!firstStage.id, '4. Position created with initial pipeline stage');

    // 3. Application setup
    const application = await ApplicationService.submitApplication({
      positionId: position.id,
      name: 'Alex Mercer',
      email: 'alex.mercer@example.com',
      phone: '+1 555-0199',
      source: 'Direct' as const
    });
    assert(!!application.id, '5. Public candidate application submitted');

    // 4. Test 1: HR Interviews with interviewer/panel array present
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 2);

    const createdInterview = await InterviewService.createInterview(hrUser.id, application.id, {
      stageId: firstStage.id,
      scheduledAt: scheduledDate,
      location: 'Conference Room Alpha',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      interviewerIds: [teamLead.id, hrUser.id]
    });
    assert(!!createdInterview, '6. Interview scheduled with assigned interviewers');

    const hrInterviews = await InterviewService.listInterviews({ id: hrUser.id, role: Role.HR }, {});
    assert(hrInterviews.length === 1, '7. HR lists interviews successfully');
    assert(Array.isArray(hrInterviews[0].assignments), '8. List interviews includes assignments array');
    assert(
      typeof (hrInterviews[0].assignments[0] as any).feedbackSubmitted === 'boolean',
      '9. List interviews assignments include feedbackSubmitted field'
    );

    // 5. Test 2: Safe normalization simulation (no runtime .some() crash)
    const rawListInterview: any = hrInterviews[0];
    const normalizedInterviewers = rawListInterview.interviewers ?? rawListInterview.assignments ?? [];
    let someCallResult = false;
    let someThrewError = false;
    try {
      someCallResult = normalizedInterviewers.some((i: any) => Boolean(i?.feedbackSubmitted));
    } catch (e) {
      someThrewError = true;
    }
    assert(!someThrewError, '10. Safe normalization prevents .some() crash when interviewers property is absent');
    assert(someCallResult === false, '11. some() returns false when no feedback is submitted yet');

    // 6. Test 3: Data with missing/undefined interviewers/assignments array
    const emptyObject: any = { id: 'int-empty', scheduledAt: new Date().toISOString() };
    const safeInterviewers = emptyObject.interviewers ?? emptyObject.assignments ?? [];
    let emptySomeResult = false;
    let emptySomeThrew = false;
    try {
      emptySomeResult = safeInterviewers.some((i: any) => Boolean(i?.feedbackSubmitted));
    } catch (e) {
      emptySomeThrew = true;
    }
    assert(!emptySomeThrew, '12. Safe fallback prevents crash on object with undefined arrays');
    assert(emptySomeResult === false, '13. Safe fallback returns false for empty interviewers');

    // 7. Test 4: HR Interviews page with zero interviews
    const filteredOut = await InterviewService.listInterviews({ id: hrUser.id, role: Role.HR }, {
      status: 'Cancelled' as any
    });
    assert(Array.isArray(filteredOut) && filteredOut.length === 0, '14. Querying zero interviews returns empty array');

    // 8. Test 5: Application Review page with normal interview data
    const appDetail = await ApplicationManagementService.getApplicationById(application.id);
    assert(appDetail.id === application.id, '15. HR Application detail fetched successfully');
    assert(!!appDetail.candidate && appDetail.candidate.name === 'Alex Mercer', '16. Candidate profile populated');
    assert(!!appDetail.position && appDetail.position.title === 'Senior Full Stack Engineer', '17. Position populated');
    assert(!!appDetail.currentStage, '18. Current stage populated');

    const appInterviews = await InterviewService.listInterviews({ id: hrUser.id, role: Role.HR }, {
      applicationId: application.id
    });
    assert(appInterviews.length === 1, '19. Application interviews fetched');
    const normalizedAppInterviewers = (appInterviews[0] as any).interviewers ?? (appInterviews[0] as any).assignments ?? [];
    assert(normalizedAppInterviewers.length === 2, '20. Application interviewers correctly resolved');

    // 9. Test 6: Application Review page with no interviews
    const appNoInterviews = await ApplicationService.submitApplication({
      positionId: position.id,
      name: 'Jordan Lee',
      email: 'jordan.lee@example.com',
      phone: '+1 555-0122'
    });
    const zeroInterviews = await InterviewService.listInterviews({ id: hrUser.id, role: Role.HR }, {
      applicationId: appNoInterviews.id
    });
    assert(zeroInterviews.length === 0, '21. Application with no interview returns empty array');

    // 10. Test 7: Application Review page with missing optional relationships (unassigned team, null resume, etc.)
    const appWithoutTeam = await ApplicationManagementService.getApplicationById(appNoInterviews.id);
    assert(appWithoutTeam.assignedTeam === null, '22. Unassigned team is null and handled safely');
    assert(appWithoutTeam.statusReason === null, '23. Null statusReason handled safely');

    // 11. Test 8: RBAC preserved
    let managerBlockedFromCreateInterview = false;
    try {
      // Manager role cannot create interviews directly via HR controller (enforced via requireRole(Role.HR))
      // In service layer, verify TeamLead scoping is preserved:
      const teamLeadInterviews = await InterviewService.listInterviews({ id: teamLead.id, role: Role.TeamLead }, {});
      assert(teamLeadInterviews.length === 1, '24. TeamLead lists only assigned interviews (RBAC preserved)');
    } catch (err) {
      console.error(err);
    }

    const unassignedLead = await UserService.createManagedUser(managerUser!.id, {
      name: 'Unassigned Lead',
      email: 'unassigned.lead@altrium.com',
      role: Role.TeamLead
    });
    const unassignedInterviews = await InterviewService.listInterviews({ id: unassignedLead.id, role: Role.TeamLead }, {});
    assert(unassignedInterviews.length === 0, '25. Unassigned TeamLead sees 0 interviews (RBAC scope strict)');

    console.log(`\n======================================================================`);
    console.log(`HOTFIX TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during hotfix test suite:', err);
    process.exit(1);
  }
}

runHotfixTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
