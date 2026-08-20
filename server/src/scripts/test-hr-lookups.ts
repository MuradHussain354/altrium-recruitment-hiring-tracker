import dotenv from 'dotenv';
import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

async function runHRLookupTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('==================================================');
  console.log('STARTING SPRINT 1 HR LOOKUP ENDPOINTS TEST SUITE');
  console.log('==================================================\n');

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

  // Start ephemeral test server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  try {
    // 1. Clean DB
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

    // Bootstrap Manager
    await bootstrapManager();
    const managerUser = await prisma.user.findFirst({ where: { role: Role.Manager } });
    if (!managerUser) throw new Error('Manager bootstrap failed');

    const defaultPassword = 'TestPassword123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Ensure manager password hash matches test suite defaultPassword
    await prisma.user.update({
      where: { id: managerUser.id },
      data: { passwordHash }
    });

    // Create test accounts: Active HR, Inactive HR, Active TeamLead, Inactive TeamLead
    const hrActive = await prisma.user.create({
      data: {
        name: 'Zara HR Active',
        email: 'zara.hr@altrium.local',
        passwordHash,
        role: Role.HR,
        isActive: true,
        createdById: managerUser.id
      }
    });

    const hrInactive = await prisma.user.create({
      data: {
        name: 'Ian HR Inactive',
        email: 'ian.hr@altrium.local',
        passwordHash,
        role: Role.HR,
        isActive: false,
        createdById: managerUser.id
      }
    });

    const teamLeadActive = await prisma.user.create({
      data: {
        name: 'Alex Lead Active',
        email: 'alex.lead@altrium.local',
        passwordHash,
        role: Role.TeamLead,
        isActive: true,
        createdById: managerUser.id
      }
    });

    const teamLeadInactive = await prisma.user.create({
      data: {
        name: 'Toby Lead Inactive',
        email: 'toby.lead@altrium.local',
        passwordHash,
        role: Role.TeamLead,
        isActive: false,
        createdById: managerUser.id
      }
    });

    // Create 2 test Teams (out of alphabetical order to verify sorting)
    const teamZ = await prisma.team.create({
      data: {
        name: 'Zeta Mobile Team',
        createdById: managerUser.id
      }
    });

    const teamA = await prisma.team.create({
      data: {
        name: 'Alpha Core Team',
        createdById: managerUser.id
      }
    });

    // Helper to log in and get JWT token
    async function getToken(email: string): Promise<string> {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: defaultPassword })
      });
      const data = (await res.json()) as any;
      return data.token;
    }

    const managerToken = await getToken(managerUser.email);
    const hrToken = await getToken(hrActive.email);
    const teamLeadToken = await getToken(teamLeadActive.email);

    console.log('--- SECTION 1: TEAM LOOKUP (GET /api/v1/teams) ---');

    // 1.1 Public -> 401
    const resTeamPublic = await fetch(`${baseUrl}/teams`);
    assert(resTeamPublic.status === 401, '1.1 Public request to GET /teams returns 401 Unauthorized');

    // 1.2 TeamLead -> 403
    const resTeamTL = await fetch(`${baseUrl}/teams`, {
      headers: { Authorization: `Bearer ${teamLeadToken}` }
    });
    assert(resTeamTL.status === 403, '1.2 TeamLead request to GET /teams returns 403 Forbidden');

    // 1.3 HR -> 200
    const resTeamHR = await fetch(`${baseUrl}/teams`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(resTeamHR.status === 200, '1.3 HR request to GET /teams returns 200 OK');
    const teamHRBody = (await resTeamHR.json()) as any;

    // 1.4 Manager -> 200
    const resTeamManager = await fetch(`${baseUrl}/teams`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resTeamManager.status === 200, '1.4 Manager request to GET /teams returns 200 OK');

    // 1.5 Team data validation
    assert(teamHRBody.count === 2, '1.5 Team response count matches total teams (2)');
    assert(Array.isArray(teamHRBody.data) && teamHRBody.data.length === 2, '1.5b Team data is an array of length 2');
    assert(teamHRBody.data[0].name === 'Alpha Core Team' && teamHRBody.data[1].name === 'Zeta Mobile Team', '1.6 Teams are sorted alphabetically by name ASC');
    assert(teamHRBody.data[0].id === teamA.id && teamHRBody.data[1].id === teamZ.id, '1.7 Team IDs match database records');

    // 1.8 Security: no sensitive or unneeded fields exposed
    const teamKeys = Object.keys(teamHRBody.data[0]);
    assert(teamKeys.length === 2 && teamKeys.includes('id') && teamKeys.includes('name'), '1.8 Team records strictly contain only id and name');
    assert(!('createdById' in teamHRBody.data[0]), '1.8b createdById is not exposed in team lookup');

    // Count audit logs before
    const auditCountBefore = await prisma.auditLog.count();

    // Perform another lookup
    await fetch(`${baseUrl}/teams`, { headers: { Authorization: `Bearer ${hrToken}` } });
    const auditCountAfterTeam = await prisma.auditLog.count();
    assert(auditCountAfterTeam === auditCountBefore, '1.9 GET /teams creates zero AuditLog entries');

    console.log('\n--- SECTION 2: INTERVIEWER LOOKUP (GET /api/v1/users/interviewers) ---');

    // 2.1 Public -> 401
    const resInterviewerPublic = await fetch(`${baseUrl}/users/interviewers`);
    assert(resInterviewerPublic.status === 401, '2.1 Public request to GET /users/interviewers returns 401 Unauthorized');

    // 2.2 TeamLead -> 403
    const resInterviewerTL = await fetch(`${baseUrl}/users/interviewers`, {
      headers: { Authorization: `Bearer ${teamLeadToken}` }
    });
    assert(resInterviewerTL.status === 403, '2.2 TeamLead request to GET /users/interviewers returns 403 Forbidden');

    // 2.3 HR -> 200
    const resInterviewerHR = await fetch(`${baseUrl}/users/interviewers`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(resInterviewerHR.status === 200, '2.3 HR request to GET /users/interviewers returns 200 OK');
    const interviewerHRBody = (await resInterviewerHR.json()) as any;

    // 2.4 Manager -> 200
    const resInterviewerManager = await fetch(`${baseUrl}/users/interviewers`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resInterviewerManager.status === 200, '2.4 Manager request to GET /users/interviewers returns 200 OK');

    // 2.5 Active HR & TeamLead returned, Managers and Inactive users excluded
    const returnedUsers = interviewerHRBody.data;
    assert(interviewerHRBody.count === 2, '2.5 Interviewers count is 2 (only active HR and active TeamLead)');
    assert(returnedUsers.length === 2, '2.5b Returned data array length is 2');

    const hasAlex = returnedUsers.some((u: any) => u.id === teamLeadActive.id && u.role === 'TeamLead' && u.isActive === true);
    const hasZara = returnedUsers.some((u: any) => u.id === hrActive.id && u.role === 'HR' && u.isActive === true);
    const hasManager = returnedUsers.some((u: any) => u.role === 'Manager');
    const hasInactiveHR = returnedUsers.some((u: any) => u.id === hrInactive.id);
    const hasInactiveTL = returnedUsers.some((u: any) => u.id === teamLeadInactive.id);

    assert(hasAlex && hasZara, '2.6 Active HR and active TeamLead are returned');
    assert(!hasManager, '2.7 Manager accounts are strictly excluded from interviewer list');
    assert(!hasInactiveHR && !hasInactiveTL, '2.8 Inactive HR and inactive TeamLead users are strictly excluded');

    // 2.9 Sorting: Alex Lead Active (A) before Zara HR Active (Z)
    assert(returnedUsers[0].name === 'Alex Lead Active' && returnedUsers[1].name === 'Zara HR Active', '2.9 Interviewers are sorted alphabetically by name ASC');

    // 2.10 Security: passwordHash and internal audit/creator fields are strictly absent
    const sampleUser = returnedUsers[0];
    assert(!('passwordHash' in sampleUser), '2.10 passwordHash is strictly excluded from interviewer records');
    assert(!('createdById' in sampleUser), '2.11 createdById is strictly excluded');
    assert('id' in sampleUser && 'name' in sampleUser && 'email' in sampleUser && 'role' in sampleUser && 'isActive' in sampleUser, '2.12 Interviewer records expose only safe fields (id, name, email, role, isActive, teamId)');

    // 2.13 Zero audit logs created
    const auditCountBeforeInt = await prisma.auditLog.count();
    await fetch(`${baseUrl}/users/interviewers`, { headers: { Authorization: `Bearer ${hrToken}` } });
    const auditCountAfterInt = await prisma.auditLog.count();
    assert(auditCountAfterInt === auditCountBeforeInt, '2.13 GET /users/interviewers creates zero AuditLog entries');

    console.log('\n--- SECTION 3: MANAGER RBAC PRESERVATION ---');

    // 3.1 HR cannot create user -> 403
    const resCreateUserHR = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized User',
        email: 'unauthorized@altrium.local',
        password: 'Password123!',
        role: 'TeamLead'
      })
    });
    assert(resCreateUserHR.status === 403, '3.1 HR cannot create users (POST /api/v1/users returns 403 Forbidden)');

    // 3.2 TeamLead cannot create user -> 403
    const resCreateUserTL = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamLeadToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized User TL',
        email: 'unauthorized_tl@altrium.local',
        password: 'Password123!',
        role: 'TeamLead'
      })
    });
    assert(resCreateUserTL.status === 403, '3.2 TeamLead cannot create users (POST /api/v1/users returns 403 Forbidden)');

    // 3.3 Manager can create user -> 201
    const resCreateUserMgr = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: 'New Authorized HR',
        email: 'new_hr@altrium.local',
        password: 'Password123!',
        role: 'HR'
      })
    });
    assert(resCreateUserMgr.status === 201, '3.3 Manager can create users (POST /api/v1/users returns 201 Created)');

    // 3.4 HR cannot toggle user status -> 403
    const resStatusHR = await fetch(`${baseUrl}/users/${teamLeadActive.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(resStatusHR.status === 403, '3.4 HR cannot toggle user status (PATCH /api/v1/users/:id/status returns 403 Forbidden)');

    // 3.5 Manager can toggle user status -> 200
    const resStatusMgr = await fetch(`${baseUrl}/users/${teamLeadActive.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(resStatusMgr.status === 200, '3.5 Manager can toggle user status (PATCH /api/v1/users/:id/status returns 200 OK)');

    console.log('\n==================================================');
    console.log(`HR LOOKUP TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runHRLookupTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
