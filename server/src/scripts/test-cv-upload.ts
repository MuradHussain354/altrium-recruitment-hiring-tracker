import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { UserService } from '../services/user.service';
import { activateTestUserWithPassword } from './_test-helpers';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationManagementService } from '../services/application-management.service';
import { InterviewService } from '../services/interview.service';
import { ReportService } from '../services/report.service';
import { StorageService } from '../services/storage.service';
import { Role, PositionStatus } from '@prisma/client';

async function runCvUploadTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('============================================================');
  console.log('STARTING SPRINT 1 CV FILE UPLOAD & CLOUD STORAGE TEST SUITE');
  console.log('============================================================\n');

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

  // Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  try {
    // 0. Clean DB
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

    // 1. Seed Manager, HR, and TeamLead users
    await bootstrapManager();
    const manager = (await prisma.user.findFirst({ where: { role: Role.Manager } }))!;

    const hr = await UserService.createManagedUser(manager.id, {
      name: 'HR Recruiter',
      email: 'hr.recruiter@altrium.com',
      role: Role.HR
    });
    await activateTestUserWithPassword('hr.recruiter@altrium.com', 'HrPassword123!');

    const teamLead = await UserService.createManagedUser(manager.id, {
      name: 'Engineering Lead',
      email: 'teamlead@altrium.com',
      role: Role.TeamLead
    });
    await activateTestUserWithPassword('teamlead@altrium.com', 'LeadPassword123!');

    // 2. HR creates an Open position with a pipeline stage
    const position = await PositionService.createPosition(hr.id, {
      title: 'Cloud Systems Engineer',
      department: 'Infrastructure',
      description: 'Design and operate cloud architectures and microservices.',
      headcount: 2
    });
    await StageService.createStage(hr.id, position.id, {
      name: 'Technical Screening',
      sequenceOrder: 1,
      isGating: true,
      feedbackRequiredCount: 1
    });
    await PositionService.updatePositionStatus(hr.id, position.id, PositionStatus.Open);

    // Prepare test file buffers
    // PDF header: %PDF-1.4
    const validPdfBuffer = Buffer.from('%PDF-1.4 Valid candidate CV resume content for test verification');
    // DOC header: \xD0\xCF\x11\xE0
    const validDocBuffer = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.from('Valid DOC resume body content')
    ]);
    // DOCX header: PK\x03\x04
    const validDocxBuffer = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('Valid DOCX resume zip archive body content')
    ]);
    // Executable disguised as PDF: MZ header
    const disguisedExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00Disguised executable malware pretending to be pdf');

    // -------------------------------------------------------------
    // TEST 1: Valid PDF Accepted
    // -------------------------------------------------------------
    const form1 = new FormData();
    form1.append('name', 'Alice PDF Candidate');
    form1.append('email', 'alice.pdf@example.com');
    form1.append('positionId', position.id);
    form1.append('resume', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'alice_resume.pdf');

    const res1 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form1
    });
    const data1 = await res1.json();
    assert(res1.status === 201, '1. Valid PDF accepted with HTTP 201 Created');
    assert(!!data1.data?.candidate?.resumeUrl, '1b. Candidate record contains secure resumeUrl');
    assert(data1.data?.candidate?.resumeUrl.includes('altrium/cv'), '1c. Resume URL stored under altrium/cv namespace');

    // -------------------------------------------------------------
    // TEST 2: Valid DOC Accepted
    // -------------------------------------------------------------
    const form2 = new FormData();
    form2.append('name', 'Bob DOC Candidate');
    form2.append('email', 'bob.doc@example.com');
    form2.append('positionId', position.id);
    form2.append('resume', new Blob([validDocBuffer], { type: 'application/msword' }), 'bob_resume.doc');

    const res2 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form2
    });
    const data2 = await res2.json();
    assert(res2.status === 201, '2. Valid DOC accepted with HTTP 201 Created');
    assert(!!data2.data?.candidate?.resumeUrl, '2b. DOC candidate record contains resumeUrl');

    // -------------------------------------------------------------
    // TEST 3: Valid DOCX Accepted
    // -------------------------------------------------------------
    const form3 = new FormData();
    form3.append('name', 'Charlie DOCX Candidate');
    form3.append('email', 'charlie.docx@example.com');
    form3.append('positionId', position.id);
    form3.append(
      'resume',
      new Blob([validDocxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }),
      'charlie_resume.docx'
    );

    const res3 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form3
    });
    const data3 = await res3.json();
    assert(res3.status === 201, '3. Valid DOCX accepted with HTTP 201 Created');
    assert(!!data3.data?.candidate?.resumeUrl, '3b. DOCX candidate record contains resumeUrl');

    // -------------------------------------------------------------
    // TEST 4: File larger than 5MB rejected
    // -------------------------------------------------------------
    const largeBuffer = Buffer.alloc(5.2 * 1024 * 1024, '%PDF-large');
    const form4 = new FormData();
    form4.append('name', 'David Large Candidate');
    form4.append('email', 'david.large@example.com');
    form4.append('positionId', position.id);
    form4.append('resume', new Blob([largeBuffer], { type: 'application/pdf' }), 'large_resume.pdf');

    const res4 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form4
    });
    const data4 = await res4.json();
    assert(res4.status === 400, '4. File larger than 5MB rejected with HTTP 400');
    assert(
      data4.message?.toLowerCase().includes('5 mb') || data4.message?.toLowerCase().includes('limit'),
      '4b. Friendly error message returned for oversize file'
    );

    // -------------------------------------------------------------
    // TEST 5: Invalid Extension Rejected (.exe / .zip / .txt)
    // -------------------------------------------------------------
    const form5 = new FormData();
    form5.append('name', 'Eve Invalid Ext');
    form5.append('email', 'eve.ext@example.com');
    form5.append('positionId', position.id);
    form5.append('resume', new Blob([Buffer.from('Plain text content')], { type: 'text/plain' }), 'resume.txt');

    const res5 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form5
    });
    assert(res5.status === 400, '5. Invalid file extension rejected with HTTP 400');

    // -------------------------------------------------------------
    // TEST 6: Invalid MIME type Rejected
    // -------------------------------------------------------------
    const form6 = new FormData();
    form6.append('name', 'Frank Invalid MIME');
    form6.append('email', 'frank.mime@example.com');
    form6.append('positionId', position.id);
    form6.append('resume', new Blob([validPdfBuffer], { type: 'image/png' }), 'resume.pdf');

    const res6 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form6
    });
    assert(res6.status === 400, '6. Invalid MIME type rejected with HTTP 400');

    // -------------------------------------------------------------
    // TEST 7: Clearly unsafe disguised executable rejected
    // -------------------------------------------------------------
    const form7 = new FormData();
    form7.append('name', 'Malicious Candidate');
    form7.append('email', 'malware@example.com');
    form7.append('positionId', position.id);
    form7.append(
      'resume',
      new Blob([disguisedExeBuffer], { type: 'application/pdf' }),
      'malware.pdf'
    );

    const res7 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form7
    });
    const data7 = await res7.json();
    assert(res7.status === 400, '7. Disguised executable binary rejected with HTTP 400');
    assert(
      data7.message?.includes('signature') || data7.message?.includes('invalid') || data7.message?.includes('format'),
      '7b. Signature validation blocks disguised binaries'
    );

    // -------------------------------------------------------------
    // TEST 7c: Missing CV / Resume rejected with HTTP 400 Bad Request
    // -------------------------------------------------------------
    const formMissingCv = new FormData();
    formMissingCv.append('name', 'No CV Candidate');
    formMissingCv.append('email', 'nocv.candidate@example.com');
    formMissingCv.append('positionId', position.id);
    formMissingCv.append('phone', '+1 555 123 4567');

    const resMissingCv = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: formMissingCv
    });
    const dataMissingCv = await resMissingCv.json();
    assert(resMissingCv.status === 400, '7c. Missing CV file rejected with HTTP 400 Bad Request');
    assert(
      dataMissingCv.message?.toLowerCase().includes('required') || dataMissingCv.message?.toLowerCase().includes('cv'),
      '7d. Missing CV returns friendly user-safe error indicating CV is required'
    );

    const noCvCandidateInDb = await prisma.candidate.findFirst({
      where: { email: 'nocv.candidate@example.com' }
    });
    assert(!noCvCandidateInDb, '7e. Missing CV request creates ZERO Candidate records');

    const noCvAppInDb = await prisma.application.findFirst({
      where: { candidate: { email: 'nocv.candidate@example.com' } }
    });
    assert(!noCvAppInDb, '7f. Missing CV request creates ZERO Application records');

    // -------------------------------------------------------------
    // TEST 8: Successful application stores resulting resumeUrl
    // -------------------------------------------------------------
    const candidateInDb = await prisma.candidate.findFirst({
      where: { email: 'alice.pdf@example.com' }
    });
    assert(!!candidateInDb && !!candidateInDb.resumeUrl, '8. Database Candidate entity stores resulting resumeUrl');

    // -------------------------------------------------------------
    // TEST 9: Duplicate application still returns 409
    // -------------------------------------------------------------
    const form9 = new FormData();
    form9.append('name', 'Alice PDF Candidate');
    form9.append('email', 'alice.pdf@example.com');
    form9.append('positionId', position.id);
    form9.append('resume', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'alice_dup.pdf');

    const res9 = await fetch(`${baseUrl}/public/applications`, {
      method: 'POST',
      body: form9
    });
    const data9 = await res9.json();
    assert(res9.status === 409, '9. Duplicate candidate application returns HTTP 409 Conflict');
    assert(
      data9.message?.includes('already applied'),
      '9b. Duplicate application returns friendly already-applied message'
    );

    // -------------------------------------------------------------
    // TEST 10: Duplicate/failed submission does not leave orphaned file
    // -------------------------------------------------------------
    const deletedList = StorageService.getDeletedPublicIdsForTesting();
    assert(
      deletedList.length > 0,
      '10. StorageService cleanup invoked on duplicate/failed submission'
    );

    // -------------------------------------------------------------
    // TEST 11: HR can retrieve application and CV reference
    // -------------------------------------------------------------
    const hrApps = await ApplicationManagementService.listApplications({});
    const targetApp = hrApps.find((a: any) => a.candidate.email === 'alice.pdf@example.com');
    assert(!!targetApp, '11a. HR can list candidate applications');

    const hrDetail = await ApplicationManagementService.getApplicationById(data1.data.id);
    assert(
      !!hrDetail && !!hrDetail.candidate?.resumeUrl,
      '11b. HR can retrieve candidate application detail including CV resumeUrl'
    );

    // -------------------------------------------------------------
    // TEST 12: Manager reports do not expose resumeUrl
    // -------------------------------------------------------------
    const overviewReport = await ReportService.getOverviewReport({});
    const serializedOverview = JSON.stringify(overviewReport);
    assert(
      !serializedOverview.includes('alice.pdf@example.com') && !serializedOverview.includes('resumeUrl'),
      '12. Manager overview report does NOT expose candidate resumeUrl'
    );

    const pipelineReport = await ReportService.getPipelineReport({});
    const serializedPipeline = JSON.stringify(pipelineReport);
    assert(
      !serializedPipeline.includes('resumeUrl') && !serializedPipeline.includes('alice_resume.pdf'),
      '12b. Manager pipeline report does NOT expose candidate resumeUrl'
    );

    // -------------------------------------------------------------
    // TEST 13: TeamLead interview response does not expose resumeUrl
    // -------------------------------------------------------------
    const stageRecord = await prisma.stage.findFirst({ where: { positionId: position.id } });
    await InterviewService.createInterview(hr.id, data1.data.id, {
      stageId: stageRecord!.id,
      scheduledAt: new Date(Date.now() + 86400000),
      interviewerIds: [teamLead.id]
    });

    const leadInterviews = await InterviewService.listInterviews(
      { id: teamLead.id, role: Role.TeamLead },
      {}
    );
    const serializedLeadInterviews = JSON.stringify(leadInterviews);
    assert(
      !serializedLeadInterviews.includes('resumeUrl') && !serializedLeadInterviews.includes('alice_resume.pdf'),
      '13. TeamLead interview response does NOT expose resumeUrl'
    );

    // -------------------------------------------------------------
    // TEST 14: Existing legacy resumeUrl records remain readable by HR
    // -------------------------------------------------------------
    const legacyCandidate = await prisma.candidate.create({
      data: {
        name: 'Legacy Candidate',
        email: 'legacy.candidate@example.com',
        resumeUrl: 'https://external-storage.example.com/legacy-cv.pdf'
      }
    });
    const legacyApp = await prisma.application.create({
      data: {
        candidateId: legacyCandidate.id,
        positionId: position.id,
        currentStageId: stageRecord!.id
      }
    });

    const legacyDetail = await ApplicationManagementService.getApplicationById(legacyApp.id);
    assert(
      legacyDetail?.candidate?.resumeUrl === 'https://external-storage.example.com/legacy-cv.pdf',
      '14. HR can read legacy external resumeUrl records seamlessly'
    );

    // -------------------------------------------------------------
    // TEST 15: No storage credentials or internal secrets exposed
    // -------------------------------------------------------------
    const resAllJson = JSON.stringify([data1, data2, data3, data4, data7, data9]);
    assert(
      !resAllJson.includes('CLOUDINARY') &&
        !resAllJson.includes('api_secret') &&
        !resAllJson.includes('API_SECRET') &&
        !resAllJson.includes('passwordHash'),
      '15. No storage credentials, API secrets, or password hashes exposed in responses'
    );

    console.log('\n============================================================');
    console.log(`CV UPLOAD TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');
  } catch (error: any) {
    console.error('CV UPLOAD TEST ERROR:', error);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runCvUploadTests();
