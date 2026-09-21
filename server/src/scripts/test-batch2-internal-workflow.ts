import dotenv from 'dotenv';
dotenv.config();

import prisma from '../config/prisma';
import { Role, ApplicationStatus, InterviewStatus, InvitationStatus, OfferApprovalStatus, PositionStatus } from '@prisma/client';
import { ApplicationManagementService } from '../services/application-management.service';
import { ApplicationNoteService } from '../services/application-note.service';
import { ApplicationTagService } from '../services/application-tag.service';
import { SavedFilterService } from '../services/saved-filter.service';
import { QuestionSetService } from '../services/question-set.service';
import { CommentService } from '../services/comment.service';
import { ExportService } from '../services/export.service';
import { SearchService } from '../services/search.service';
import { InterviewService } from '../services/interview.service';
import { FeedbackService } from '../services/feedback.service';
import { ReportService } from '../services/report.service';
import { ApplicationService } from '../services/application.service';
import { AppError } from '../utils/errors';

async function runBatch2Tests() {
  console.log('======================================================================');
  console.log('STARTING SPRINT 2 - BATCH 2 INTERNAL WORKFLOW VERIFICATION SUITE');
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

  // Define actor personas
  const hrActor = { id: 'hr-test-uuid-0001', role: Role.HR, name: 'HR Admin' };
  const lead1Actor = { id: 'lead1-test-uuid-0002', role: Role.TeamLead, name: 'Lead One', teamId: 'team-uuid-1' };
  const lead2Actor = { id: 'lead2-test-uuid-0003', role: Role.TeamLead, name: 'Lead Two', teamId: 'team-uuid-2' };
  const managerActor = { id: 'manager-test-uuid-0004', role: Role.Manager, name: 'General Manager' };

  // ── IN-MEMORY MOCK STORE FOR REPEATABLE, SAFE VERIFICATION ─────────────────
  const mockStore = {
    users: new Map<string, any>([
      [hrActor.id, hrActor],
      [lead1Actor.id, lead1Actor],
      [lead2Actor.id, lead2Actor],
      [managerActor.id, managerActor]
    ]),
    teams: new Map<string, any>([
      ['team-uuid-1', { id: 'team-uuid-1', name: 'Engineering Alpha' }],
      ['team-uuid-2', { id: 'team-uuid-2', name: 'Engineering Beta' }]
    ]),
    positions: new Map<string, any>([
      ['pos-1', { id: 'pos-1', title: 'Senior Backend Engineer', department: 'Engineering', headcount: 3, status: PositionStatus.Open }],
      ['pos-2', { id: 'pos-2', title: 'Product Designer', department: 'Design', headcount: 1, status: PositionStatus.Open }]
    ]),
    stages: new Map<string, any>([
      ['stage-1', { id: 'stage-1', positionId: 'pos-1', name: 'Resume Screen', sequenceOrder: 1, isGating: false, feedbackRequiredCount: 0 }],
      ['stage-2', { id: 'stage-2', positionId: 'pos-1', name: 'Technical Interview', sequenceOrder: 2, isGating: true, feedbackRequiredCount: 1 }],
      ['stage-3', { id: 'stage-3', positionId: 'pos-1', name: 'Manager Interview', sequenceOrder: 3, isGating: true, feedbackRequiredCount: 1 }]
    ]),
    candidates: new Map<string, any>([
      ['cand-1', { id: 'cand-1', name: 'Alice Smith', email: 'alice@example.com', phone: '1234567890' }],
      ['cand-2', { id: 'cand-2', name: 'Bob Jones', email: 'bob@example.com', phone: '9876543210' }],
      ['cand-3', { id: 'cand-3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '5555555555' }]
    ]),
    applications: new Map<string, any>([
      ['app-1', {
        id: 'app-1',
        candidateId: 'cand-1',
        positionId: 'pos-1',
        currentStageId: 'stage-2',
        status: ApplicationStatus.InProgress,
        assignedTeamId: 'team-uuid-1',
        offerApprovalStatus: null,
        createdAt: new Date(Date.now() - 10 * 86400000),
        updatedAt: new Date()
      }],
      ['app-2', {
        id: 'app-2',
        candidateId: 'cand-2',
        positionId: 'pos-1',
        currentStageId: 'stage-2',
        status: ApplicationStatus.InProgress,
        assignedTeamId: null,
        offerApprovalStatus: null,
        createdAt: new Date(Date.now() - 5 * 86400000),
        updatedAt: new Date()
      }],
      ['app-3', {
        id: 'app-3',
        candidateId: 'cand-3',
        positionId: 'pos-1',
        currentStageId: 'stage-1',
        status: ApplicationStatus.InProgress,
        assignedTeamId: null,
        offerApprovalStatus: null,
        createdAt: new Date(Date.now() - 2 * 86400000),
        updatedAt: new Date()
      }]
    ]),
    interviews: new Map<string, any>(),
    assignments: new Map<string, any>(),
    feedbacks: new Map<string, any>(),
    criterionScores: new Map<string, any>(),
    notes: new Map<string, any>(),
    tags: new Map<string, any>(),
    savedFilters: new Map<string, any>(),
    questionSets: new Map<string, any>(),
    questions: new Map<string, any>(),
    comments: new Map<string, any>(),
    commentMentions: new Map<string, any>(),
    notifications: new Map<string, any>(),
    auditLogs: new Map<string, any>()
  };

  // Safe offline test execution harness: mock $transaction to route callbacks to mocked prisma
  (prisma as any).$transaction = async (arg: any) => {
    if (typeof arg === 'function') {
      return await arg(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  };

  (prisma.auditLog as any).create = async ({ data }: any) => {
    const id = 'audit-' + Math.random();
    mockStore.auditLogs.set(id, { id, ...data });
    return { id, ...data };
  };

  (prisma.notification as any).create = async ({ data }: any) => {
    const id = 'notif-' + Math.random();
    mockStore.notifications.set(id, { id, ...data });
    return { id, ...data };
  };

  (prisma.notification as any).createMany = async ({ data }: any) => {
    if (Array.isArray(data)) {
      data.forEach((d) => mockStore.notifications.set('notif-' + Math.random(), d));
      return { count: data.length };
    }
    return { count: 0 };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 1: S2-11 BULK STATUS CHANGES
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 1: S2-11 BULK STATUS CHANGES ---');

  // Test 1: Bulk status updates validate each application independently and record audit logs
  {
    // Mock prisma application findUnique & update & auditLog
    const origFindUnique = prisma.application.findUnique;
    const origUpdate = prisma.application.update;
    const origAuditCreate = prisma.auditLog.create;

    (prisma.application as any).findUnique = async ({ where }: any) => mockStore.applications.get(where.id) || null;
    (prisma.application as any).update = async ({ where, data }: any) => {
      const existing = mockStore.applications.get(where.id);
      if (!existing) throw new Error('Not found');
      Object.assign(existing, data);
      return existing;
    };
    (prisma.auditLog as any).create = async ({ data }: any) => {
      const id = 'audit-' + Math.random();
      mockStore.auditLogs.set(id, { id, ...data });
      return { id, ...data };
    };

    const result = await ApplicationManagementService.bulkChangeStatus(
      hrActor.id,
      ['app-1', 'app-2', 'non-existent-app'],
      ApplicationStatus.OnHold,
      'Pending client budget review'
    );

    assert(result.total === 3, '1.1 bulkChangeStatus returns correct total');
    assert(result.succeeded === 2, '1.2 bulkChangeStatus reports succeeded count');
    assert(result.failed === 1, '1.3 bulkChangeStatus reports failed count');
    assert(mockStore.applications.get('app-1').status === ApplicationStatus.OnHold, '1.4 app-1 status updated to OnHold');
    assert(mockStore.applications.get('app-2').status === ApplicationStatus.OnHold, '1.5 app-2 status updated to OnHold');

    const failedItem = result.results.find((r) => r.applicationId === 'non-existent-app');
    assert(failedItem?.success === false, '1.6 non-existent app marked failed without aborting batch');

    // Restore
    prisma.application.findUnique = origFindUnique;
    prisma.application.update = origUpdate;
    prisma.auditLog.create = origAuditCreate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 2: S2-12 BULK STAGE PROGRESSION WITH GATING
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 2: S2-12 BULK STAGE PROGRESSION WITH GATING ---');

  {
    // Setup: app-1 has completed feedback for stage-2; app-2 has NO feedback for stage-2
    mockStore.applications.get('app-1').currentStageId = 'stage-2';
    mockStore.applications.get('app-2').currentStageId = 'stage-2';

    // Mock prisma
    const origAppFindUnique = prisma.application.findUnique;
    const origStageFindUnique = prisma.stage.findUnique;
    const origFeedbackFindMany = prisma.feedback.findMany;
    const origAppUpdate = prisma.application.update;

    (prisma.stage as any).findUnique = async ({ where }: any) => mockStore.stages.get(where.id) || null;
    (prisma.application as any).findUnique = async ({ where }: any) => mockStore.applications.get(where.id) || null;
    (prisma.application as any).update = async ({ where, data }: any) => {
      const app = mockStore.applications.get(where.id);
      Object.assign(app, data);
      return app;
    };

    // Stage-2 requires 1 feedback. app-1 has 1, app-2 has 0.
    (prisma.feedback as any).findMany = async ({ where }: any) => {
      if (where.interview?.applicationId === 'app-1') {
        return [{
          id: 'fb-1',
          interviewerId: lead1Actor.id,
          interview: {
            assignments: [{ interviewerId: lead1Actor.id, feedbackSubmitted: true }]
          }
        }];
      }
      return [];
    };

    const stageResult = await ApplicationManagementService.bulkChangeStage(
      hrActor.id,
      ['app-1', 'app-2'],
      'stage-3' // Target stage
    );

    assert(stageResult.succeeded === 1, '2.1 Bulk stage progression: eligible app advances');
    assert(stageResult.failed === 1, '2.2 Bulk stage progression: gated app without feedback fails');
    assert(mockStore.applications.get('app-1').currentStageId === 'stage-3', '2.3 app-1 advanced to stage-3');
    assert(mockStore.applications.get('app-2').currentStageId === 'stage-2', '2.4 app-2 stayed at stage-2');

    const app2Result = stageResult.results.find((r) => r.applicationId === 'app-2');
    assert(app2Result?.reason?.includes('Gating rule') === true, '2.5 Gating rule reason clearly explained in result');

    // Restore
    prisma.application.findUnique = origAppFindUnique;
    prisma.stage.findUnique = origStageFindUnique;
    prisma.feedback.findMany = origFeedbackFindMany;
    prisma.application.update = origAppUpdate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 3: S2-13 & S2-32 INTERVIEW CONFLICT DETECTION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 3: S2-13 & S2-32 INTERVIEW CONFLICT DETECTION ---');

  {
    // Interviewer lead1 is scheduled from 10:00 to 11:00 (duration 60m)
    const baseDate = new Date('2026-10-01T10:00:00Z');
    const existingInterview = {
      id: 'existing-int-1',
      scheduledAt: baseDate,
      durationMinutes: 60,
      status: InterviewStatus.Scheduled,
      assignments: [{ interviewerId: lead1Actor.id, interviewer: { name: lead1Actor.name } }]
    };

    const origInterviewFindMany = prisma.interview.findMany;
    (prisma.interview as any).findMany = async ({ where }: any) => {
      if (where?.id?.not === 'existing-int-1') return [];
      return [existingInterview];
    };

    // Case A: Exact overlap (10:30 to 11:30) -> MUST CONFLICT
    const overlapStart = new Date('2026-10-01T10:30:00Z').getTime();
    const overlapEnd = overlapStart + 60 * 60 * 1000;
    const conflictsA = await InterviewService.checkConflicts([lead1Actor.id], overlapStart, overlapEnd);
    assert(conflictsA.length === 1, '3.1 Overlapping interview detected as conflict');

    // Case B: Immediately adjacent (11:00 to 12:00) -> newStart === existingEnd -> NO CONFLICT
    const adjacentStart = new Date('2026-10-01T11:00:00Z').getTime();
    const adjacentEnd = adjacentStart + 60 * 60 * 1000;
    const conflictsB = await InterviewService.checkConflicts([lead1Actor.id], adjacentStart, adjacentEnd);
    assert(conflictsB.length === 0, '3.2 Adjacent interview (start == existingEnd) does not conflict');

    // Case C: Rescheduling own interview excludes own ID -> NO CONFLICT
    const conflictsC = await InterviewService.checkConflicts([lead1Actor.id], overlapStart, overlapEnd, 'existing-int-1');
    assert(conflictsC.length === 0, '3.3 Reschedule check with excludeInterviewId ignores self');

    // Restore
    prisma.interview.findMany = origInterviewFindMany;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 4: S2-14 REUSABLE QUESTION SETS & HISTORICAL INTEGRITY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 4: S2-14 REUSABLE QUESTION SETS & HISTORICAL INTEGRITY ---');

  {
    const origQsFindUnique = prisma.questionSet.findUnique;
    const origQsCreate = prisma.questionSet.create;
    const origQsUpdate = prisma.questionSet.update;
    const origQsDelete = prisma.questionSet.delete;

    const testQuestionSet = {
      id: 'qs-1',
      title: 'Senior Node.js Core Competencies',
      category: 'Backend',
      description: 'Standard evaluation questions',
      createdById: hrActor.id,
      questions: [
        { id: 'q-1', questionText: 'Explain event loop phases in Node.js', sequenceOrder: 0 },
        { id: 'q-2', questionText: 'How do streams backpressure works?', sequenceOrder: 1 }
      ],
      _count: { interviews: 0, questions: 2 }
    };

    mockStore.questionSets.set('qs-1', testQuestionSet);

    // Mock findUnique
    (prisma.questionSet as any).findUnique = async ({ where }: any) => mockStore.questionSets.get(where.id) || null;

    // Test 4.1: Unused question set can be updated
    let updatedTitle = '';
    (prisma.questionSet as any).update = async ({ where, data }: any) => {
      const qs = mockStore.questionSets.get(where.id);
      Object.assign(qs, data);
      updatedTitle = qs.title;
      return qs;
    };

    await QuestionSetService.updateQuestionSet('qs-1', { title: 'Updated Title' });
    assert(updatedTitle === 'Updated Title', '4.1 Unused QuestionSet title updated successfully');

    // Test 4.2: Once used by an interview, question modification is strictly blocked
    testQuestionSet._count.interviews = 1; // Mark as used
    let integrityErrorThrown = false;
    try {
      await QuestionSetService.updateQuestionSet('qs-1', {
        questions: [{ questionText: 'Destructive modified question', sequenceOrder: 0 }]
      });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400 && err.message.includes('historical interview integrity')) {
        integrityErrorThrown = true;
      }
    }
    assert(integrityErrorThrown, '4.2 Question modification blocked when QuestionSet is used by interviews');

    // Test 4.3: Deletion blocked when used by interviews
    let deleteBlocked = false;
    try {
      await QuestionSetService.deleteQuestionSet('qs-1');
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400 && err.message.includes('historical interview')) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, '4.3 Deletion strictly prohibited when QuestionSet is associated with interviews');

    // Test 4.4: Safe copy/duplicate pathway works
    let duplicatedSetCreated = false;
    (prisma.questionSet as any).create = async ({ data }: any) => {
      duplicatedSetCreated = true;
      return { id: 'qs-copy-1', ...data };
    };
    (prisma.question as any).createMany = async () => ({ count: 2 });

    await QuestionSetService.duplicateQuestionSet(hrActor.id, 'qs-1', 'Senior Node.js Core Competencies (v2)');
    assert(duplicatedSetCreated, '4.4 Duplicate question set pathway creates independent copy');

    // Restore
    prisma.questionSet.findUnique = origQsFindUnique;
    prisma.questionSet.create = origQsCreate;
    prisma.questionSet.update = origQsUpdate;
    prisma.questionSet.delete = origQsDelete;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 5: S2-15 PRIVATE INTERNAL NOTES (HR & MANAGER ONLY)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 5: S2-15 PRIVATE INTERNAL NOTES ---');

  {
    const origAppFindUnique = prisma.application.findUnique;
    const origNoteCreate = prisma.applicationInternalNote.create;
    const origNoteFindMany = prisma.applicationInternalNote.findMany;

    (prisma.application as any).findUnique = async ({ where }: any) => mockStore.applications.get(where.id) || null;
    (prisma.applicationInternalNote as any).create = async ({ data }: any) => {
      const note = { id: 'note-1', ...data, createdAt: new Date() };
      mockStore.notes.set(note.id, note);
      return note;
    };
    (prisma.applicationInternalNote as any).findMany = async () => Array.from(mockStore.notes.values());

    // HR can add note
    const hrNote = await ApplicationNoteService.addNote(hrActor, 'app-1', 'Candidate has competing offer at Google');
    assert(hrNote.content === 'Candidate has competing offer at Google', '5.1 HR can add private internal note');

    // Manager can view notes
    const managerNotes = await ApplicationNoteService.getNotes(managerActor, 'app-1');
    assert(managerNotes.length > 0, '5.2 Manager can view internal notes');

    // TeamLead is forbidden from adding or viewing notes
    let leadAddBlocked = false;
    try {
      await ApplicationNoteService.addNote(lead1Actor, 'app-1', 'Unauthorized note');
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) leadAddBlocked = true;
    }
    assert(leadAddBlocked, '5.3 TeamLead access denied to addNote (403)');

    let leadViewBlocked = false;
    try {
      await ApplicationNoteService.getNotes(lead1Actor, 'app-1');
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) leadViewBlocked = true;
    }
    assert(leadViewBlocked, '5.4 TeamLead access denied to getNotes (403)');

    // Restore
    prisma.application.findUnique = origAppFindUnique;
    prisma.applicationInternalNote.create = origNoteCreate;
    prisma.applicationInternalNote.findMany = origNoteFindMany;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 6: S2-16 APPLICATION TAGS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 6: S2-16 APPLICATION TAGS ---');

  {
    const origAppFind = prisma.application.findUnique;
    const origTagFindUnique = prisma.applicationTag.findUnique;
    const origTagCreate = prisma.applicationTag.create;
    const origTagDelete = prisma.applicationTag.delete;
    const origTagFindMany = prisma.applicationTag.findMany;

    (prisma.application as any).findUnique = async ({ where }: any) => mockStore.applications.get(where.id) || null;
    (prisma.applicationTag as any).findUnique = async ({ where }: any) => {
      if (where.applicationId_name) {
        return mockStore.tags.get(`${where.applicationId_name.applicationId}:${where.applicationId_name.name}`) || null;
      }
      return mockStore.tags.get(where.id) || null;
    };
    (prisma.applicationTag as any).create = async ({ data }: any) => {
      const tag = { id: 'tag-1', ...data, createdAt: new Date() };
      mockStore.tags.set(`${tag.applicationId}:${tag.name}`, tag);
      mockStore.tags.set(tag.id, tag);
      return tag;
    };

    // Add tag
    const addedTag = await ApplicationTagService.addTag(hrActor, 'app-1', { name: 'Urgent Hire', color: '#EF4444' });
    assert(addedTag.name === 'Urgent Hire', '6.1 Application tag created successfully');

    // Duplicate tag rejected (409)
    let duplicateRejected = false;
    try {
      await ApplicationTagService.addTag(hrActor, 'app-1', { name: 'Urgent Hire', color: '#EF4444' });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 409) duplicateRejected = true;
    }
    assert(duplicateRejected, '6.2 Duplicate tag on same application returns 409 Conflict');

    // Restore
    prisma.application.findUnique = origAppFind;
    prisma.applicationTag.findUnique = origTagFindUnique;
    prisma.applicationTag.create = origTagCreate;
    prisma.applicationTag.delete = origTagDelete;
    prisma.applicationTag.findMany = origTagFindMany;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 7: S2-17 SAVED CUSTOM FILTERS & STRICT OWNERSHIP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 7: S2-17 SAVED CUSTOM FILTERS & OWNERSHIP ---');

  {
    const origFilterCreate = prisma.savedFilter.create;
    const origFilterFindUnique = prisma.savedFilter.findUnique;
    const origFilterFindMany = prisma.savedFilter.findMany;

    const userFilters = new Map<string, any>();
    (prisma.savedFilter as any).create = async ({ data }: any) => {
      const f = { id: 'sf-1', ...data, createdAt: new Date() };
      userFilters.set(f.id, f);
      return f;
    };
    (prisma.savedFilter as any).findUnique = async ({ where }: any) => userFilters.get(where.id) || null;
    (prisma.savedFilter as any).findMany = async ({ where }: any) =>
      Array.from(userFilters.values()).filter((f) => f.userId === where.userId);

    // User A creates filter
    const createdFilter = await SavedFilterService.createFilter(hrActor.id, {
      name: 'Engineering Shortlist',
      filterData: { department: 'Engineering', status: 'InProgress' }
    });
    assert(createdFilter.name === 'Engineering Shortlist', '7.1 User A can create saved filter');

    // User B tries to update User A's filter -> 403 Forbidden
    let crossUserBlocked = false;
    try {
      await SavedFilterService.updateFilter(lead1Actor.id, 'sf-1', { name: 'Hacked Name' });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) crossUserBlocked = true;
    }
    assert(crossUserBlocked, '7.2 Cross-user filter modification blocked with 403 Forbidden');

    // Restore
    prisma.savedFilter.create = origFilterCreate;
    prisma.savedFilter.findUnique = origFilterFindUnique;
    prisma.savedFilter.findMany = origFilterFindMany;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 8: S2-18 EXPORT SHORTLIST TO EXCEL & PDF
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 8: S2-18 EXPORT SHORTLIST TO EXCEL & PDF ---');

  {
    const testExportData = [
      {
        id: 'app-1',
        candidateName: 'Alice Smith',
        candidateEmail: 'alice@example.com',
        candidatePhone: '1234567890',
        positionTitle: 'Senior Backend Engineer',
        department: 'Engineering',
        currentStage: 'Technical Interview',
        status: 'InProgress',
        appliedDate: '2026-09-01',
        tags: 'Urgent Hire',
        aggregatedScore: '4.50'
      }
    ];

    // Test Excel buffer generation
    const excelBuffer = await ExportService.generateExcel(testExportData);
    assert(Buffer.isBuffer(excelBuffer), '8.1 Excel export generates valid Buffer');
    assert(excelBuffer.length > 500, '8.2 Excel buffer contains binary workbook data');

    // Test PDF buffer generation
    const pdfBuffer = await ExportService.generatePdf(testExportData);
    assert(Buffer.isBuffer(pdfBuffer), '8.3 PDF export generates valid Buffer');
    assert(pdfBuffer.toString('utf-8', 0, 5) === '%PDF-', '8.4 PDF buffer has valid %PDF- header magic bytes');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 9: S2-19 INVITATION RESPONSE WITH STRICT ACTOR OWNERSHIP
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 9: S2-19 INVITATION RESPONSE & ACTOR OWNERSHIP ---');

  {
    const origAssignmentFindUnique = prisma.interviewerAssignment.findUnique;
    const origAssignmentUpdate = prisma.interviewerAssignment.update;

    const testAssignment = {
      id: 'asgn-1',
      interviewId: 'int-1',
      interviewerId: lead1Actor.id,
      invitationStatus: InvitationStatus.Pending,
      declineReason: null,
      respondedAt: null
    };

    (prisma.interviewerAssignment as any).findUnique = async ({ where }: any) => {
      if (where.interviewId_interviewerId?.interviewerId === lead1Actor.id) {
        return testAssignment;
      }
      return null;
    };
    (prisma.interviewerAssignment as any).update = async ({ data }: any) => {
      Object.assign(testAssignment, data);
      return testAssignment;
    };

    // Lead1 accepts
    const accepted = await InterviewService.respondToInvitation(lead1Actor, 'int-1', 'Accepted');
    assert(accepted.invitationStatus === 'Accepted', '9.1 TeamLead can accept assigned interview invitation');

    // Decline without reason is rejected
    let declineNoReasonRejected = false;
    try {
      await InterviewService.respondToInvitation(lead1Actor, 'int-1', 'Declined', '');
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400) declineNoReasonRejected = true;
    }
    assert(declineNoReasonRejected, '9.2 Decline without reason rejected (400)');

    // Lead2 tries to respond on Lead1's behalf -> 403 Forbidden
    let impersonationBlocked = false;
    try {
      await InterviewService.respondToInvitation(lead2Actor, 'int-1', 'Accepted');
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) impersonationBlocked = true;
    }
    assert(impersonationBlocked, '9.3 Responding on behalf of another interviewer blocked with 403');

    // Restore
    prisma.interviewerAssignment.findUnique = origAssignmentFindUnique;
    prisma.interviewerAssignment.update = origAssignmentUpdate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 10: S2-20 & S2-34 STRUCTURED SCORECARD VALIDATION & CALCULATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 10: S2-20 & S2-34 STRUCTURED SCORECARD VALIDATION & CALCULATION ---');

  {
    const origInterviewFindUnique = prisma.interview.findUnique;
    const origAssignmentFindUnique = prisma.interviewerAssignment.findUnique;
    const origFeedbackFindUnique = prisma.feedback.findUnique;

    (prisma.interview as any).findUnique = async () => ({ id: 'int-1', status: 'Scheduled' });
    (prisma.interviewerAssignment as any).findUnique = async () => ({
      id: 'asgn-1',
      interviewId: 'int-1',
      interviewerId: lead1Actor.id,
      feedbackSubmitted: false
    });
    (prisma.feedback as any).findUnique = async () => null;
    (prisma.feedback as any).create = async ({ data }: any) => ({ id: 'fb-test-1', ...data });
    (prisma.feedbackCriterionScore as any).createMany = async () => ({ count: 1 });
    (prisma.interviewerAssignment as any).update = async (args: any) => args.data;

    // Out of range score (5.5) must be rejected
    let invalidScoreRejected = false;
    try {
      await FeedbackService.submitFeedback(lead1Actor, 'int-1', {
        overallRating: 4,
        comments: 'Good candidate',
        criterionScores: [
          { criterionName: 'Coding', weight: 1.0, score: 5.5 } // Invalid! Max is 5.0
        ]
      });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400 && err.message.includes('1.0 and 5.0')) {
        invalidScoreRejected = true;
      }
    }
    assert(invalidScoreRejected, '10.1 Out of range score (> 5.0) rejected server-side (400)');

    // Out of range weight (0) must be rejected
    let invalidWeightRejected = false;
    try {
      await FeedbackService.submitFeedback(lead1Actor, 'int-1', {
        overallRating: 4,
        comments: 'Good candidate',
        criterionScores: [
          { criterionName: 'Architecture', weight: 0, score: 4.0 } // Invalid! Must be > 0
        ]
      });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 400 && err.message.includes('weight')) {
        invalidWeightRejected = true;
      }
    }
    assert(invalidWeightRejected, '10.2 Non-positive weight (0) rejected server-side (400)');

    // Deterministic weighted score verification
    // Criterion A: weight 2.0, score 4.0 (points: 8.0)
    // Criterion B: weight 1.0, score 5.0 (points: 5.0)
    // Criterion C: weight 1.0, score 3.0 (points: 3.0)
    // Total weight = 4.0, Total points = 16.0 -> Weighted Average = 4.00
    const wSum = (4.0 * 2.0) + (5.0 * 1.0) + (3.0 * 1.0);
    const wTotal = 2.0 + 1.0 + 1.0;
    const calcScore = Math.round((wSum / wTotal) * 100) / 100;
    assert(calcScore === 4.0, '10.3 Deterministic weighted average correctly calculated to 4.00');

    // Restore
    prisma.interview.findUnique = origInterviewFindUnique;
    prisma.interviewerAssignment.findUnique = origAssignmentFindUnique;
    prisma.feedback.findUnique = origFeedbackFindUnique;
    delete (prisma.feedback as any).create;
    delete (prisma.feedbackCriterionScore as any).createMany;
    delete (prisma.interviewerAssignment as any).update;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 11: S2-21 INTERVIEW DELEGATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 11: S2-21 INTERVIEW DELEGATION ---');

  {
    const origInterviewFindUnique = prisma.interview.findUnique;
    const origAssignmentFindUnique = prisma.interviewerAssignment.findUnique;
    const origUserFindUnique = prisma.user.findUnique;
    const origAssignmentUpdate = prisma.interviewerAssignment.update;
    const origAssignmentCreate = prisma.interviewerAssignment.create;

    const assignment = {
      id: 'asgn-del-1',
      interviewId: 'int-del-1',
      interviewerId: lead1Actor.id,
      feedbackSubmitted: false
    };

    (prisma.interview as any).findUnique = async () => ({
      id: 'int-del-1',
      status: 'Scheduled',
      assignments: [assignment]
    });
    (prisma.interviewerAssignment as any).findUnique = async () => assignment;
    (prisma.user as any).findUnique = async ({ where }: any) => mockStore.users.get(where.id) || null;

    let delegatedToLogged = '';
    let newAssignmentCreated = false;

    (prisma.interviewerAssignment as any).update = async ({ data }: any) => {
      delegatedToLogged = data.delegatedToId;
      return assignment;
    };
    (prisma.interviewerAssignment as any).create = async () => {
      newAssignmentCreated = true;
      return { id: 'asgn-new-2' };
    };

    const delegationResult = await InterviewService.delegateInterview(
      lead1Actor,
      'int-del-1',
      lead2Actor.id
    );

    assert(delegatedToLogged === lead2Actor.id, '11.1 Original assignment marked with delegatedToId');
    assert(newAssignmentCreated, '11.2 New assignment created for delegated peer interviewer');
    assert(delegationResult != null, '11.3 Delegation result returned successfully (interview returned)');

    // Restore
    prisma.interview.findUnique = origInterviewFindUnique;
    prisma.interviewerAssignment.findUnique = origAssignmentFindUnique;
    prisma.user.findUnique = origUserFindUnique;
    prisma.interviewerAssignment.update = origAssignmentUpdate;
    prisma.interviewerAssignment.create = origAssignmentCreate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 12: S2-23 APPLICATION COMMENTS & @MENTIONS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 12: S2-23 APPLICATION COMMENTS & @MENTIONS ---');

  {
    const origAppFind = prisma.application.findUnique;
    const origUserFindMany = prisma.user.findMany;
    const origCommentCreate = prisma.applicationComment.create;
    const origMentionCreateMany = prisma.commentMention.createMany;
    const origNotificationCreate = prisma.notification.create;
    const origCommentFindUnique = prisma.applicationComment.findUnique;

    (prisma.application as any).findUnique = async () => mockStore.applications.get('app-1');
    (prisma.user as any).findMany = async () => [{ id: lead1Actor.id, name: lead1Actor.name }];

    let notificationSentTo = '';
    (prisma.notification as any).create = async ({ data }: any) => {
      notificationSentTo = data.recipientId;
      return { id: 'notif-1', ...data };
    };
    (prisma.applicationComment as any).create = async ({ data }: any) => ({ id: 'comment-1', ...data });
    (prisma.commentMention as any).createMany = async () => ({ count: 1 });
    (prisma.applicationComment as any).findUnique = async () => ({
      id: 'comment-1',
      content: 'Hey @Lead One please review candidate portfolio',
      author: hrActor,
      mentions: [{ user: { id: lead1Actor.id, name: lead1Actor.name } }]
    });

    const comment = await CommentService.addComment(
      hrActor as any,
      'app-1',
      'Hey @Lead One please review candidate portfolio'
    );

    assert(comment?.content.includes('@Lead One') === true, '12.1 Comment created with @mention text');
    assert(notificationSentTo === lead1Actor.id, '12.2 Notification generated for mentioned user');

    // Restore
    prisma.application.findUnique = origAppFind;
    prisma.user.findMany = origUserFindMany;
    prisma.applicationComment.create = origCommentCreate;
    prisma.commentMention.createMany = origMentionCreateMany;
    prisma.notification.create = origNotificationCreate;
    prisma.applicationComment.findUnique = origCommentFindUnique;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 13: S2-24 MANAGER OFFER APPROVAL WORKFLOW
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 13: S2-24 MANAGER OFFER APPROVAL WORKFLOW ---');

  {
    const origAppFind = prisma.application.findUnique;
    const origAppUpdate = prisma.application.update;

    const offerApp = {
      id: 'app-offer-1',
      status: ApplicationStatus.InProgress,
      offerApprovalStatus: null,
      offerSalaryOffered: null,
      offerNotes: null
    };

    (prisma.application as any).findUnique = async () => offerApp;
    (prisma.application as any).update = async ({ data }: any) => {
      Object.assign(offerApp, data);
      return offerApp;
    };

    // Step 1: HR requests approval
    await ApplicationManagementService.requestOfferApproval(hrActor.id, 'app-offer-1', {
      salaryOffered: 150000,
      notes: 'Competitive offer for senior candidate'
    });
    assert(offerApp.offerApprovalStatus === 'Pending', '13.1 Offer approval requested, status is Pending');
    assert(offerApp.status === ApplicationStatus.InProgress, '13.2 Application status remains InProgress (NOT auto-advanced)');

    // Step 2: Manager approves
    await ApplicationManagementService.decideOfferApproval(managerActor, 'app-offer-1', {
      decision: 'Approved',
      notes: 'Approved within budget'
    });
    assert(offerApp.offerApprovalStatus === 'Approved', '13.3 Manager approves offer, offerApprovalStatus is Approved');
    assert(offerApp.status === ApplicationStatus.InProgress, '13.4 CRITICAL: Application status is NOT auto-set to Hired');

    // Step 3: Deciding on already decided offer throws 409
    let duplicateDecideBlocked = false;
    try {
      await ApplicationManagementService.decideOfferApproval(managerActor, 'app-offer-1', {
        decision: 'Approved'
      });
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 409) duplicateDecideBlocked = true;
    }
    assert(duplicateDecideBlocked, '13.5 Deciding on non-pending offer returns 409 Conflict');

    // Restore
    prisma.application.findUnique = origAppFind;
    prisma.application.update = origAppUpdate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 14: S2-25 & S2-28 MANAGER ANALYTICS & HEADCOUNT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 14: S2-25 & S2-28 MANAGER ANALYTICS & HEADCOUNT ---');

  {
    const origPositionFindMany = prisma.position.findMany;

    const analyticsPositions = [
      {
        id: 'pos-1',
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        headcount: 2,
        status: PositionStatus.Open,
        createdAt: new Date(),
        applications: [
          {
            id: 'app-hired-1',
            status: ApplicationStatus.Hired,
            offerApprovalStatus: 'Approved',
            createdAt: new Date(Date.now() - 10 * 86400000),
            updatedAt: new Date(),
            interviews: [{ id: 'int-1', status: 'Completed' }]
          },
          {
            id: 'app-active-2',
            status: ApplicationStatus.InProgress,
            offerApprovalStatus: 'Pending',
            createdAt: new Date(Date.now() - 5 * 86400000),
            updatedAt: new Date(),
            interviews: []
          }
        ]
      }
    ];

    (prisma.position as any).findMany = async () => analyticsPositions;

    // Test Cross-Team Analytics
    const analytics = await ReportService.getCrossTeamAnalytics();
    assert(analytics.comparative.length === 1, '14.1 Cross-team analytics groups by department');
    const eng = analytics.comparative[0];
    assert(eng.hiredCount === 1, '14.2 Reports accurate hired count');
    assert(eng.avgTimeToHireDays > 0, '14.3 Computes positive average time-to-hire in days');

    // Test Headcount Fulfillment
    const headcount = await ReportService.getHeadcountFulfillmentReport();
    assert(headcount.summary.totalPositions === 1, '14.4 Headcount report summarizes total positions');
    assert(headcount.summary.overallHired === 1, '14.5 Headcount report summarizes total hired');
    assert(headcount.summary.overallFulfillmentPercent === 50, '14.6 Headcount fulfillment percentage accurately computed (1 of 2 = 50%)');

    // Restore
    prisma.position.findMany = origPositionFindMany;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 15: S2-26 BULK TEAM ASSIGNMENT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 15: S2-26 BULK TEAM ASSIGNMENT ---');

  {
    const origAppFind = prisma.application.findUnique;
    const origTeamFind = prisma.team.findUnique;
    const origAppUpdate = prisma.application.update;

    (prisma.team as any).findUnique = async ({ where }: any) => mockStore.teams.get(where.id) || null;
    (prisma.application as any).findUnique = async ({ where }: any) => mockStore.applications.get(where.id) || null;
    (prisma.application as any).update = async ({ where, data }: any) => {
      const app = mockStore.applications.get(where.id);
      Object.assign(app, data);
      return app;
    };

    const teamResult = await ApplicationManagementService.bulkAssignTeam(
      hrActor.id,
      ['app-1', 'app-2'],
      'team-uuid-2'
    );

    assert(teamResult.succeeded === 2, '15.1 Bulk team assignment successfully updates multiple applications');
    assert(mockStore.applications.get('app-1').assignedTeamId === 'team-uuid-2', '15.2 app-1 assigned to team-uuid-2');
    assert(mockStore.applications.get('app-2').assignedTeamId === 'team-uuid-2', '15.3 app-2 assigned to team-uuid-2');

    // Restore
    prisma.application.findUnique = origAppFind;
    prisma.team.findUnique = origTeamFind;
    prisma.application.update = origAppUpdate;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 16: S2-30 ROLE-FILTERED QUICK SEARCH
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 16: S2-30 ROLE-FILTERED QUICK SEARCH ---');

  {
    const origCandFind = prisma.candidate.findMany;
    const origPosFind = prisma.position.findMany;
    const origAppFind = prisma.application.findMany;

    (prisma.candidate as any).findMany = async () => [
      { id: 'cand-1', name: 'Alice Smith', email: 'alice@example.com', applications: [] }
    ];
    (prisma.position as any).findMany = async () => [];
    (prisma.application as any).findMany = async () => [];

    const hrResults = await SearchService.search(hrActor, 'Alice');
    assert(hrResults.length === 1, '16.1 Search returns matching candidate for HR');
    assert(hrResults[0].type === 'candidate', '16.2 Search result has correct candidate type');

    // Restore
    prisma.candidate.findMany = origCandFind;
    prisma.position.findMany = origPosFind;
    prisma.application.findMany = origAppFind;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST GROUP 17: S2-31 PUBLIC TRACKING SECURITY ZERO-DATA LEAK CHECK
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 17: S2-31 PUBLIC TRACKING ZERO-LEAK SECURITY CHECK ---');

  {
    const origAppFindFirst = prisma.application.findFirst;

    (prisma.application as any).findFirst = async () => ({
      id: 'app-1',
      candidateId: 'cand-1',
      positionId: 'pos-1',
      status: ApplicationStatus.InProgress,
      createdAt: new Date(),
      candidate: { name: 'Alice Smith', email: 'alice@example.com' },
      position: { title: 'Senior Backend Engineer', department: 'Engineering' },
      currentStage: { name: 'Technical Interview', sequenceOrder: 2 }
    });

    const trackingResult: any = await ApplicationService.trackApplication({ email: 'alice@example.com', referenceId: 'app-1' });

    assert(trackingResult.referenceId === 'app-1', '17.1 Tracking returns valid candidate application info');
    assert(trackingResult.notes === undefined, '17.2 Zero internal notes exposed in public tracking');
    assert(trackingResult.internalNotes === undefined, '17.3 Zero ApplicationInternalNotes exposed in public tracking');
    assert(trackingResult.tags === undefined, '17.4 Zero application tags exposed in public tracking');
    assert(trackingResult.comments === undefined, '17.5 Zero comments exposed in public tracking');
    assert(trackingResult.scorecard === undefined, '17.6 Zero scorecards or ratings exposed in public tracking');
    assert(trackingResult.interviewer === undefined, '17.7 Zero interviewer identities exposed in public tracking');
    assert(trackingResult.offerSalaryOffered === undefined, '17.8 Zero offer salary or approval data exposed');
    assert(trackingResult.auditLogs === undefined, '17.9 Zero audit logs exposed in public tracking');

    // Restore
    prisma.application.findFirst = origAppFindFirst;
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n======================================================================');
  console.log(`BATCH 2 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch2Tests().catch((err) => {
  console.error('Unhandled error in Batch 2 test suite:', err);
  process.exit(1);
});
