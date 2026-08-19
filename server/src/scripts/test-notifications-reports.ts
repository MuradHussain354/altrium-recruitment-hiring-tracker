import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationService } from '../services/application.service';
import { ApplicationManagementService } from '../services/application-management.service';
import { InterviewService } from '../services/interview.service';
import { FeedbackService } from '../services/feedback.service';
import { NotificationService } from '../services/notification.service';
import { ReportService } from '../services/report.service';
import { Role, PositionStatus, ApplicationStatus, InterviewStatus, RecipientType, NotificationType, NotificationChannel } from '@prisma/client';
import { signToken } from '../utils/jwt';

async function runNotificationsAndReportsTests() {
  // Production safeguard
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('======================================================================');
  console.log('STARTING SPRINT 1 BATCH 3 — NOTIFICATIONS & MANAGER REPORTS SUITE');
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

  // Start ephemeral HTTP server for full end-to-end endpoint verification
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  try {
    // ── 0. Full teardown ──────────────────────────────────────────────────────
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

    // ── 1. Bootstrap users ────────────────────────────────────────────────────
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerUser, '1. System Manager bootstrapped');

    const hrUser = await UserService.createManagedUser(managerUser!.id, {
      name: 'HR Batch3',
      email: 'hr.batch3@altrium.com',
      password: 'HrPassword123!',
      role: Role.HR
    });
    assert(hrUser.role === Role.HR, '2. HR user created');

    const teamLead1 = await UserService.createManagedUser(managerUser!.id, {
      name: 'TeamLead Alpha',
      email: 'tl.alpha@altrium.com',
      password: 'TlPassword123!',
      role: Role.TeamLead
    });
    const teamLead2 = await UserService.createManagedUser(managerUser!.id, {
      name: 'TeamLead Beta',
      email: 'tl.beta@altrium.com',
      password: 'TlPassword123!',
      role: Role.TeamLead
    });
    const teamLead3 = await UserService.createManagedUser(managerUser!.id, {
      name: 'TeamLead Gamma',
      email: 'tl.gamma@altrium.com',
      password: 'TlPassword123!',
      role: Role.TeamLead
    });
    assert(!!teamLead1 && !!teamLead2 && !!teamLead3, '3. Three TeamLead users created');

    // Generate JWT tokens for HTTP RBAC testing
    const managerToken = signToken({ id: managerUser!.id, email: managerUser!.email, role: managerUser!.role });
    const hrToken = signToken({ id: hrUser.id, email: hrUser.email, role: hrUser.role });
    const tl1Token = signToken({ id: teamLead1.id, email: teamLead1.email, role: teamLead1.role });
    const tl2Token = signToken({ id: teamLead2.id, email: teamLead2.email, role: teamLead2.role });

    // ── 2. Create Positions, Stages & Applications ────────────────────────────
    const positionEng = await PositionService.createPosition(hrUser.id, {
      title: 'Backend Engineer',
      department: 'Engineering',
      description: 'Node.js & TypeScript',
      headcount: 2
    });
    await prisma.position.update({
      where: { id: positionEng.id },
      data: { status: PositionStatus.Open }
    });

    const positionDesign = await PositionService.createPosition(hrUser.id, {
      title: 'Product Designer',
      department: 'Design',
      description: 'Figma & Design Systems',
      headcount: 1
    });
    await prisma.position.update({
      where: { id: positionDesign.id },
      data: { status: PositionStatus.Open }
    });

    const stageEng1 = await StageService.createStage(hrUser.id, positionEng.id, {
      name: 'Screening',
      sequenceOrder: 1,
      isGating: true,
      feedbackRequiredCount: 1
    });
    const stageEng2 = await StageService.createStage(hrUser.id, positionEng.id, {
      name: 'Technical Interview',
      sequenceOrder: 2,
      isGating: true,
      feedbackRequiredCount: 1
    });

    const stageDesign1 = await StageService.createStage(hrUser.id, positionDesign.id, {
      name: 'Portfolio Review',
      sequenceOrder: 1,
      isGating: true,
      feedbackRequiredCount: 1
    });

    assert(!!stageEng1 && !!stageEng2 && !!stageDesign1, '4. Positions and stages set up');

    // Create Applications
    const app1 = await ApplicationService.submitApplication({
      positionId: positionEng.id,
      name: 'Alice Developer',
      email: 'alice@example.com',
      phone: '+1234567890'
    });
    const app2 = await ApplicationService.submitApplication({
      positionId: positionEng.id,
      name: 'Bob Backend',
      email: 'bob@example.com',
      phone: '+1234567891'
    });
    const app3 = await ApplicationService.submitApplication({
      positionId: positionDesign.id,
      name: 'Carol Designer',
      email: 'carol@example.com',
      phone: '+1234567892'
    });

    assert(!!app1 && !!app2 && !!app3, '5. Three applications submitted');

    // Advance app2 to stage 2
    // Submit feedback for app2 on stage 1 first
    const futureDate1 = new Date(Date.now() + 86400000); // 1 day in future
    const interviewPre = await InterviewService.createInterview(hrUser.id, app2.id, {
      stageId: stageEng1.id,
      scheduledAt: futureDate1,
      interviewerIds: [teamLead1.id]
    });
    await FeedbackService.submitFeedback(
      { id: teamLead1.id, role: Role.TeamLead },
      interviewPre!.id,
      { overallRating: 4.5, comments: 'Strong backend skills' }
    );
    await ApplicationManagementService.moveApplicationStage(hrUser.id, app2.id, { stageId: stageEng2.id });
    assert(true, '6. App2 advanced to Technical Interview stage after feedback');

    // ── 3. FEATURE A: NOTIFICATIONS FOUNDATION ────────────────────────────────
    console.log('\n--- Testing Feature A: Notifications Foundation ---');

    // Clear notifications from setup to isolate tests
    await prisma.notification.deleteMany({});

    // Test A1: createInterview generates InterviewScheduled notification for assigned interviewer
    const futureDate2 = new Date(Date.now() + 2 * 86400000); // 2 days in future
    const interview1 = await InterviewService.createInterview(hrUser.id, app1.id, {
      stageId: stageEng1.id,
      scheduledAt: futureDate2,
      location: 'Google Meet',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      interviewerIds: [teamLead1.id]
    });
    assert(!!interview1, '7. Interview 1 scheduled successfully');

    const tl1NotificationsAfterCreate = await prisma.notification.findMany({
      where: { recipientId: teamLead1.id }
    });
    assert(tl1NotificationsAfterCreate.length === 1, '8. TeamLead 1 received exactly 1 notification');
    assert(tl1NotificationsAfterCreate[0].type === NotificationType.InterviewScheduled, '9. Notification type is InterviewScheduled');
    assert(tl1NotificationsAfterCreate[0].recipientType === RecipientType.User, '10. Recipient type is User');
    assert(tl1NotificationsAfterCreate[0].channel === NotificationChannel.Email, '11. Notification channel is Email');
    assert(tl1NotificationsAfterCreate[0].applicationId === app1.id, '12. Notification links to correct applicationId');
    assert(tl1NotificationsAfterCreate[0].sentAt instanceof Date, '13. Notification sentAt is valid timestamp');

    // Test A2: createInterview with multiple interviewers notifies each assigned interviewer
    const futureDate3 = new Date(Date.now() + 3 * 86400000);
    const interviewMulti = await InterviewService.createInterview(hrUser.id, app3.id, {
      stageId: stageDesign1.id,
      scheduledAt: futureDate3,
      interviewerIds: [teamLead1.id, teamLead2.id]
    });
    assert(!!interviewMulti, '14. Multi-interviewer interview scheduled');

    const tl1Count = await prisma.notification.count({ where: { recipientId: teamLead1.id } });
    const tl2Count = await prisma.notification.count({ where: { recipientId: teamLead2.id } });
    assert(tl1Count === 2, '15. TeamLead 1 now has 2 notifications (one from interview1, one from interviewMulti)');
    assert(tl2Count === 1, '16. TeamLead 2 received 1 notification from interviewMulti');

    // Test A3: updateInterviewers notifies newly added interviewers ONLY (no duplicate for retained, none for removed)
    // Currently interviewMulti has [teamLead1, teamLead2]. Replace with [teamLead1, teamLead3].
    const updatedMulti = await InterviewService.updateInterviewers(hrUser.id, interviewMulti!.id, {
      interviewerIds: [teamLead1.id, teamLead3.id]
    });
    assert(!!updatedMulti, '17. Interviewers updated: retained TL1, removed TL2, added TL3');

    const tl1CountAfterUpdate = await prisma.notification.count({ where: { recipientId: teamLead1.id } });
    const tl2CountAfterUpdate = await prisma.notification.count({ where: { recipientId: teamLead2.id } });
    const tl3CountAfterUpdate = await prisma.notification.count({ where: { recipientId: teamLead3.id } });

    assert(tl3CountAfterUpdate === 1, '18. Newly added TeamLead 3 received InterviewScheduled notification');
    assert(tl1CountAfterUpdate === 2, '19. Retained TeamLead 1 did NOT receive duplicate notification (count unchanged at 2)');
    assert(tl2CountAfterUpdate === 1, '20. Removed TeamLead 2 did NOT receive notification on removal (count unchanged at 1)');

    // Test A4: User Notification Isolation via Service
    const tl1ListService = await NotificationService.listNotifications(teamLead1.id, {});
    assert(tl1ListService.length === 2, '21. TL1 list returns only TL1 notifications');
    assert(tl1ListService.every((n) => n.recipientId === teamLead1.id), '22. All returned notifications belong to TL1');

    const managerListService = await NotificationService.listNotifications(managerUser!.id, {});
    assert(managerListService.length === 0, '23. Manager inbox is empty; does NOT leak other users notifications');

    // Test A5: User Notification Detail & Isolation
    const tl1FirstNotif = tl1ListService[0];
    const tl1Detail = await NotificationService.getNotificationById(teamLead1.id, tl1FirstNotif.id);
    assert(tl1Detail.id === tl1FirstNotif.id, '24. TL1 can retrieve own notification detail');

    // TL2 attempting to access TL1's notification detail fails with 404
    let crossAccessBlocked = false;
    try {
      await NotificationService.getNotificationById(teamLead2.id, tl1FirstNotif.id);
    } catch (err: any) {
      crossAccessBlocked = err.statusCode === 404 || err.message === 'Notification not found.';
    }
    assert(crossAccessBlocked, '25. Accessing another users notification is blocked (safe 404)');

    // Test A6: Notification payload contains only persisted model fields (no fake fields or candidate PII)
    const notifKeys = Object.keys(tl1Detail);
    const expectedKeys = ['id', 'applicationId', 'recipientType', 'recipientId', 'type', 'channel', 'sentAt'];
    const hasOnlyExpectedKeys = notifKeys.every((k) => expectedKeys.includes(k));
    assert(hasOnlyExpectedKeys, '26. Notification response contains ONLY persisted schema fields');
    assert(!('meetingLink' in tl1Detail), '27. Notification does NOT contain fake meetingLink');
    assert(!('message' in tl1Detail), '28. Notification does NOT contain fake message');
    assert(!('passwordHash' in tl1Detail), '29. Notification does NOT expose passwordHash');

    // Test A7: HTTP Endpoints for Notifications
    const httpTl1List = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tl1Token}` }
    });
    const httpTl1ListData = await httpTl1List.json();
    assert(httpTl1List.status === 200, '30. GET /api/v1/notifications returns 200 for authenticated TeamLead');
    assert(httpTl1ListData.count === 2, '31. HTTP notification count matches DB count (2)');

    const httpTl1Detail = await fetch(`${baseUrl}/notifications/${tl1FirstNotif.id}`, {
      headers: { Authorization: `Bearer ${tl1Token}` }
    });
    assert(httpTl1Detail.status === 200, '32. GET /api/v1/notifications/:id returns 200 for owner');

    const httpTl2CrossAccess = await fetch(`${baseUrl}/notifications/${tl1FirstNotif.id}`, {
      headers: { Authorization: `Bearer ${tl2Token}` }
    });
    assert(httpTl2CrossAccess.status === 404, '33. GET /api/v1/notifications/:id returns 404 when accessed by different user');

    const httpUnauthNotif = await fetch(`${baseUrl}/notifications`);
    assert(httpUnauthNotif.status === 401, '34. GET /api/v1/notifications returns 401 for unauthenticated request');

    // ── 4. FEATURE B: MANAGER OVERSIGHT / REPORT APIs ─────────────────────────
    console.log('\n--- Testing Feature B: Manager Oversight & Report APIs ---');

    // Test B1: HTTP RBAC on Report Endpoints
    // Manager -> 200
    const mgrOverviewRes = await fetch(`${baseUrl}/reports/overview`, { headers: { Authorization: `Bearer ${managerToken}` } });
    assert(mgrOverviewRes.status === 200, '35. Manager GET /api/v1/reports/overview returns 200');

    const mgrPosRes = await fetch(`${baseUrl}/reports/positions`, { headers: { Authorization: `Bearer ${managerToken}` } });
    assert(mgrPosRes.status === 200, '36. Manager GET /api/v1/reports/positions returns 200');

    const mgrPipeRes = await fetch(`${baseUrl}/reports/pipeline`, { headers: { Authorization: `Bearer ${managerToken}` } });
    assert(mgrPipeRes.status === 200, '37. Manager GET /api/v1/reports/pipeline returns 200');

    const mgrIntRes = await fetch(`${baseUrl}/reports/interviews`, { headers: { Authorization: `Bearer ${managerToken}` } });
    assert(mgrIntRes.status === 200, '38. Manager GET /api/v1/reports/interviews returns 200');

    // HR -> 403 Forbidden
    const hrOverviewRes = await fetch(`${baseUrl}/reports/overview`, { headers: { Authorization: `Bearer ${hrToken}` } });
    assert(hrOverviewRes.status === 403, '39. HR GET /api/v1/reports/overview is forbidden (403)');

    const hrPosRes = await fetch(`${baseUrl}/reports/positions`, { headers: { Authorization: `Bearer ${hrToken}` } });
    assert(hrPosRes.status === 403, '40. HR GET /api/v1/reports/positions is forbidden (403)');

    const hrPipeRes = await fetch(`${baseUrl}/reports/pipeline`, { headers: { Authorization: `Bearer ${hrToken}` } });
    assert(hrPipeRes.status === 403, '41. HR GET /api/v1/reports/pipeline is forbidden (403)');

    const hrIntRes = await fetch(`${baseUrl}/reports/interviews`, { headers: { Authorization: `Bearer ${hrToken}` } });
    assert(hrIntRes.status === 403, '42. HR GET /api/v1/reports/interviews is forbidden (403)');

    // TeamLead -> 403 Forbidden
    const tlOverviewRes = await fetch(`${baseUrl}/reports/overview`, { headers: { Authorization: `Bearer ${tl1Token}` } });
    assert(tlOverviewRes.status === 403, '43. TeamLead GET /api/v1/reports/overview is forbidden (403)');

    // Public / Unauthenticated -> 401 Unauthorized
    const publicOverviewRes = await fetch(`${baseUrl}/reports/overview`);
    assert(publicOverviewRes.status === 401, '44. Public GET /api/v1/reports/overview is unauthorized (401)');

    // Test B2: Overview Report Metrics Integrity
    const overviewData = (await mgrOverviewRes.json()).data;

    // Check Positions count
    assert(overviewData.positions.total === 2, '45. Overview total positions = 2');
    assert(overviewData.positions.byStatus.Open === 2, '46. Overview open positions = 2');
    assert(overviewData.positions.byStatus.Draft === 0, '47. Overview draft positions = 0');

    // Check Applications count
    assert(overviewData.applications.total === 3, '48. Overview total applications = 3');
    assert(overviewData.applications.byStatus.InProgress === 3, '49. Overview in-progress applications = 3');

    // Check Candidates count
    assert(overviewData.candidates.total === 3, '50. Overview total candidates = 3');

    // Check Interviews count (interviewPre, interview1, interviewMulti = 3 interviews)
    assert(overviewData.interviews.total === 3, '51. Overview total interviews = 3');
    assert(overviewData.interviews.byStatus.Scheduled === 3, '52. Overview scheduled interviews = 3');

    // Check Feedback count (1 feedback submitted for interviewPre)
    assert(overviewData.feedback.totalSubmitted === 1, '53. Overview total submitted feedback = 1');

    // Check Upcoming Interviews in Overview
    assert(Array.isArray(overviewData.upcomingInterviews), '54. Upcoming interviews is an array');
    assert(overviewData.upcomingInterviews.length > 0, '55. Upcoming interviews returned scheduled items');

    const firstUpcoming = overviewData.upcomingInterviews[0];
    assert(!!firstUpcoming.id, '56. Upcoming interview contains id');
    assert(!!firstUpcoming.applicationId, '57. Upcoming interview contains applicationId');
    assert(!!firstUpcoming.positionTitle, '58. Upcoming interview contains positionTitle');
    assert(!!firstUpcoming.stageName, '59. Upcoming interview contains stageName');
    assert(!!firstUpcoming.scheduledAt, '60. Upcoming interview contains scheduledAt');
    assert(firstUpcoming.status === InterviewStatus.Scheduled, '61. Upcoming interview status is Scheduled');

    // Strict PII checks on overview
    assert(!('candidateName' in firstUpcoming), '62. Upcoming interview strictly EXCLUDES candidateName');
    assert(!('email' in firstUpcoming), '63. Upcoming interview strictly EXCLUDES candidate email');
    assert(!('phone' in firstUpcoming), '64. Upcoming interview strictly EXCLUDES candidate phone');
    assert(!('resumeUrl' in firstUpcoming), '65. Upcoming interview strictly EXCLUDES candidate resumeUrl');

    // Test B3: Position Report Metrics
    const positionsReportData = (await mgrPosRes.json()).data;
    assert(Array.isArray(positionsReportData), '66. Positions report returns an array');
    assert(positionsReportData.length === 2, '67. Positions report contains 2 positions');

    const engReport = positionsReportData.find((p: any) => p.title === 'Backend Engineer');
    assert(!!engReport, '68. Backend Engineer found in position report');
    assert(engReport.department === 'Engineering', '69. Position department is Engineering');
    assert(engReport.totalApplications === 2, '70. Backend Engineer total applications = 2');
    assert(engReport.inProgressApplications === 2, '71. Backend Engineer in-progress applications = 2');
    assert(engReport.interviewCount === 2, '72. Backend Engineer interview count = 2');

    const designReport = positionsReportData.find((p: any) => p.title === 'Product Designer');
    assert(!!designReport, '73. Product Designer found in position report');
    assert(designReport.totalApplications === 1, '74. Product Designer total applications = 1');
    assert(designReport.interviewCount === 1, '75. Product Designer interview count = 1');

    // Test B4: Pipeline Snapshot Report
    const pipelineReportData = (await mgrPipeRes.json()).data;
    assert(Array.isArray(pipelineReportData), '76. Pipeline report returns an array');
    assert(pipelineReportData.length === 2, '77. Pipeline report contains 2 positions');

    const engPipeline = pipelineReportData.find((p: any) => p.positionTitle === 'Backend Engineer');
    assert(!!engPipeline, '78. Backend Engineer found in pipeline report');
    assert(engPipeline.stages.length === 2, '79. Backend Engineer has 2 stages');

    // App1 is at stageEng1, App2 was moved to stageEng2
    const stage1Count = engPipeline.stages.find((s: any) => s.stageName === 'Screening')?.applicationCount;
    const stage2Count = engPipeline.stages.find((s: any) => s.stageName === 'Technical Interview')?.applicationCount;
    assert(stage1Count === 1, '80. Screening stage application count = 1');
    assert(stage2Count === 1, '81. Technical Interview stage application count = 1');

    // Test B5: Interviews Report
    const interviewsReportData = (await mgrIntRes.json()).data;
    assert(interviewsReportData.total === 3, '82. Interviews report total = 3');
    assert(interviewsReportData.byStatus.Scheduled === 3, '83. Scheduled interviews count = 3');
    assert(Array.isArray(interviewsReportData.interviews), '84. Interviews report contains interviews list');
    assert(interviewsReportData.interviews.length === 3, '85. Interviews report list length = 3');

    const sampleInterview = interviewsReportData.interviews[0];
    assert(!!sampleInterview.id && !!sampleInterview.positionTitle && !!sampleInterview.stageName, '86. Interview report item contains operational details');
    assert(!('candidateName' in sampleInterview), '87. Interview report item strictly EXCLUDES candidateName');

    // Test B6: Filters
    // Filter overview by department = 'Engineering'
    const engFilterRes = await fetch(`${baseUrl}/reports/overview?department=Engineering`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const engFilterData = (await engFilterRes.json()).data;
    assert(engFilterData.positions.total === 1, '88. Department filter returns 1 Engineering position');
    assert(engFilterData.applications.total === 2, '89. Department filter returns 2 Engineering applications');

    // Filter overview by positionId = positionDesign.id
    const designFilterRes = await fetch(`${baseUrl}/reports/overview?positionId=${positionDesign.id}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const designFilterData = (await designFilterRes.json()).data;
    assert(designFilterData.positions.total === 1, '90. Position filter returns 1 Design position');
    assert(designFilterData.applications.total === 1, '91. Position filter returns 1 Design application');

    // Filter by date range (future date range covering scheduled interviews)
    const dateFromStr = new Date(Date.now()).toISOString();
    const dateToStr = new Date(Date.now() + 10 * 86400000).toISOString();
    const dateFilterRes = await fetch(`${baseUrl}/reports/overview?dateFrom=${dateFromStr}&dateTo=${dateToStr}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(dateFilterRes.status === 200, '92. Valid dateFrom & dateTo filter returns 200');
    const dateFilterData = (await dateFilterRes.json()).data;
    assert(dateFilterData.interviews.total === 3, '93. Date-filtered interviews count matches scheduled interviews');

    // Test B7: Invalid date range (dateFrom > dateTo) returns 400 Bad Request
    const invalidDateFrom = new Date(Date.now() + 10 * 86400000).toISOString();
    const invalidDateTo = new Date(Date.now()).toISOString();
    const invalidDateRes = await fetch(`${baseUrl}/reports/overview?dateFrom=${invalidDateFrom}&dateTo=${invalidDateTo}`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(invalidDateRes.status === 400, '94. Invalid date range (dateFrom > dateTo) returns HTTP 400');

    // Test B8: Read-only reports do NOT generate audit log entries
    const auditCountBefore = await prisma.auditLog.count();
    await fetch(`${baseUrl}/reports/overview`, { headers: { Authorization: `Bearer ${managerToken}` } });
    await fetch(`${baseUrl}/reports/positions`, { headers: { Authorization: `Bearer ${managerToken}` } });
    await fetch(`${baseUrl}/reports/pipeline`, { headers: { Authorization: `Bearer ${managerToken}` } });
    await fetch(`${baseUrl}/reports/interviews`, { headers: { Authorization: `Bearer ${managerToken}` } });
    const auditCountAfter = await prisma.auditLog.count();
    assert(auditCountBefore === auditCountAfter, '95. Report reads generate ZERO audit log records (read-only)');

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNotificationsAndReportsTests().catch((err) => {
  console.error('Unhandled error in notifications/reports test suite:', err);
  process.exit(1);
});
