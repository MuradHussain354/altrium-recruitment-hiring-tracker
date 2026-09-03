import dotenv from 'dotenv';
import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

async function runTeamManagementTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('==================================================');
  console.log('STARTING SPRINT 1 TEAM CREATION & MANAGEMENT TESTS');
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

    // Create HR user
    const hrUser = await prisma.user.create({
      data: {
        name: 'Helen HR',
        email: 'helen.hr@altrium.local',
        passwordHash,
        role: Role.HR,
        isActive: true,
        createdById: managerUser.id
      }
    });

    // Create TeamLead user
    const teamLeadUser = await prisma.user.create({
      data: {
        name: 'Tom Lead',
        email: 'tom.lead@altrium.local',
        passwordHash,
        role: Role.TeamLead,
        isActive: true,
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
    const hrToken = await getToken(hrUser.email);
    const teamLeadToken = await getToken(teamLeadUser.email);

    console.log('--- SECTION 1: AUTH & RBAC FOR POST /api/v1/teams ---');

    // 1. Unauthenticated request -> 401
    const resUnauth = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauth Team' })
    });
    assert(resUnauth.status === 401, '1. Unauthenticated request to POST /teams returns 401');

    // 2. HR role -> 403
    const resHR = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({ name: 'HR Team' })
    });
    assert(resHR.status === 403, '2. HR request to POST /teams returns 403 Forbidden');

    // 3. TeamLead role -> 403
    const resTL = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teamLeadToken}`
      },
      body: JSON.stringify({ name: 'TL Team' })
    });
    assert(resTL.status === 403, '3. TeamLead request to POST /teams returns 403 Forbidden');

    console.log('--- SECTION 2: VALIDATION ON POST /api/v1/teams ---');

    // 4. Empty name rejected
    const resEmpty = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: '' })
    });
    assert(resEmpty.status === 400, '4. Empty team name returns 400 Bad Request');

    // 5. Whitespace-only name rejected
    const resWhitespace = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: '   ' })
    });
    assert(resWhitespace.status === 400, '5. Whitespace-only team name returns 400 Bad Request');

    // 6. Missing name field rejected
    const resMissing = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({})
    });
    assert(resMissing.status === 400, '6. Missing team name returns 400 Bad Request');

    console.log('--- SECTION 3: MANAGER TEAM CREATION & PERSISTENCE ---');

    // 7. Manager creates team with untrimmed whitespace
    const resCreate1 = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: '  AI Engineering  ' })
    });
    assert(resCreate1.status === 201, '7. Manager successfully creates team (201 Created)');
    const bodyCreate1 = (await resCreate1.json()) as any;
    assert(bodyCreate1.data && bodyCreate1.data.name === 'AI Engineering', '8. Team name trimmed properly');
    assert(!!bodyCreate1.data.id, '9. Safe team id returned');

    // 10. Verify createdById in database
    const dbTeam = await prisma.team.findUnique({ where: { id: bodyCreate1.data.id } });
    assert(dbTeam?.createdById === managerUser.id, '10. Team createdById set to authenticated Manager id');

    // 11. Verify audit log entry
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: 'Team',
        entityId: bodyCreate1.data.id,
        actionType: 'TEAM_CREATED'
      }
    });
    assert(!!auditLog && auditLog.actorId === managerUser.id, '11. TEAM_CREATED AuditLog recorded with Manager actorId');

    // 12. Duplicate team name rejected (exact match)
    const resDupExact = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: 'AI Engineering' })
    });
    assert(resDupExact.status === 409, '12. Duplicate team name rejected with 409 Conflict');

    // 13. Duplicate team name rejected (case-insensitive)
    const resDupCase = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: 'ai engineering' })
    });
    assert(resDupCase.status === 409, '13. Duplicate case-insensitive team name rejected with 409 Conflict');

    // 14. Manager creates second team
    const resCreate2 = await fetch(`${baseUrl}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ name: 'Platform Infrastructure' })
    });
    assert(resCreate2.status === 201, '14. Manager successfully creates second team');

    console.log('--- SECTION 4: GET /api/v1/teams VERIFICATION ---');

    // 15. Manager can list teams
    const resListMgr = await fetch(`${baseUrl}/teams`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resListMgr.status === 200, '15. Manager GET /teams returns 200 OK');
    const bodyListMgr = (await resListMgr.json()) as any;
    assert(bodyListMgr.count === 2, '16. GET /teams returns 2 teams');
    assert(bodyListMgr.data[0].name === 'AI Engineering', '17. Teams returned sorted alphabetically ASC');
    assert(bodyListMgr.data[1].name === 'Platform Infrastructure', '18. Second team present in listing');

    // 19. HR can list teams
    const resListHR = await fetch(`${baseUrl}/teams`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(resListHR.status === 200, '19. HR GET /teams returns 200 OK');
    const bodyListHR = (await resListHR.json()) as any;
    assert(bodyListHR.count === 2, '20. HR sees all newly created teams');

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTeamManagementTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
