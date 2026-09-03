import dotenv from 'dotenv';
import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

dotenv.config();

async function runUserDirectoryReactivationTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('==================================================');
  console.log('STARTING SPRINT 1 STAFF DIRECTORY & REACTIVATION TESTS');
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

    await prisma.user.update({
      where: { id: managerUser.id },
      data: { passwordHash }
    });

    // Create accounts:
    // 1. Active HR
    const hrActive = await prisma.user.create({
      data: {
        name: 'Alice HR Active',
        email: 'alice.hr@altrium.local',
        passwordHash,
        role: Role.HR,
        isActive: true,
        createdById: managerUser.id
      }
    });

    // 2. Inactive HR
    const hrInactive = await prisma.user.create({
      data: {
        name: 'Bob HR Inactive',
        email: 'bob.hr@altrium.local',
        passwordHash,
        role: Role.HR,
        isActive: false,
        createdById: managerUser.id
      }
    });

    // 3. Active TeamLead
    const tlActive = await prisma.user.create({
      data: {
        name: 'Charlie TL Active',
        email: 'charlie.tl@altrium.local',
        passwordHash,
        role: Role.TeamLead,
        isActive: true,
        createdById: managerUser.id
      }
    });

    // 4. Inactive TeamLead
    const tlInactive = await prisma.user.create({
      data: {
        name: 'David TL Inactive',
        email: 'david.tl@altrium.local',
        passwordHash,
        role: Role.TeamLead,
        isActive: false,
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
    const hrActiveToken = await getToken(hrActive.email);
    const tlActiveToken = await getToken(tlActive.email);

    console.log('--- SECTION 1: RBAC ON GET /api/v1/users ---');

    // 1. Manager can access GET /api/v1/users
    const resMgr = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resMgr.status === 200, '1. Manager can GET /api/v1/users (200 OK)');
    const bodyMgr = (await resMgr.json()) as any;

    // 2. Unauthenticated request -> 401
    const resUnauth = await fetch(`${baseUrl}/users`);
    assert(resUnauth.status === 401, '2. Unauthenticated request to GET /users returns 401');

    // 3. HR request -> 403
    const resHR = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${hrActiveToken}` }
    });
    assert(resHR.status === 403, '3. HR request to GET /users returns 403 Forbidden');

    // 4. TeamLead request -> 403
    const resTL = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${tlActiveToken}` }
    });
    assert(resTL.status === 403, '4. TeamLead request to GET /users returns 403 Forbidden');

    console.log('--- SECTION 2: STAFF DIRECTORY CONTENT & PRIVACY ---');

    const usersList: any[] = bodyMgr.data || [];
    assert(bodyMgr.count === 4, '5. Directory count is 4 (all managed staff)');
    assert(usersList.length === 4, '6. Directory data contains exactly 4 records');

    // Active HR present
    assert(usersList.some((u) => u.id === hrActive.id && u.isActive === true), '7. Response contains active HR');

    // Inactive HR present
    assert(usersList.some((u) => u.id === hrInactive.id && u.isActive === false), '8. Response contains inactive HR');

    // Active TeamLead present
    assert(usersList.some((u) => u.id === tlActive.id && u.isActive === true), '9. Response contains active TeamLead');

    // Inactive TeamLead present
    assert(usersList.some((u) => u.id === tlInactive.id && u.isActive === false), '10. Response contains inactive TeamLead');

    // Manager excluded
    assert(!usersList.some((u) => u.role === 'Manager'), '11. Manager accounts are excluded from staff directory');

    // Sensitive fields excluded
    const sampleUser = usersList[0];
    assert(!('passwordHash' in sampleUser), '12. passwordHash is strictly excluded');
    assert('id' in sampleUser && 'name' in sampleUser && 'email' in sampleUser && 'role' in sampleUser && 'isActive' in sampleUser, '13. Safe profile fields exposed (id, name, email, role, isActive, teamId, createdAt)');

    console.log('--- SECTION 3: END-TO-END DEACTIVATE & REACTIVATE FLOW ---');

    // 14. Manager deactivates Charlie (active TeamLead)
    const resDeact = await fetch(`${baseUrl}/users/${tlActive.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(resDeact.status === 200, '14. Manager deactivates user (200 OK)');

    // 15. User remains in GET /users directory with isActive = false
    const resDirAfterDeact = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const dirAfterDeact = (await resDirAfterDeact.json()) as any;
    const charlieInDir = dirAfterDeact.data.find((u: any) => u.id === tlActive.id);
    assert(charlieInDir && charlieInDir.isActive === false, '15. User remains visible in GET /users with isActive: false');

    // 16. User is absent from GET /users/interviewers
    const resInterviewerAfterDeact = await fetch(`${baseUrl}/users/interviewers`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const intBodyAfterDeact = (await resInterviewerAfterDeact.json()) as any;
    assert(!intBodyAfterDeact.data.some((u: any) => u.id === tlActive.id), '16. Deactivated user absent from /users/interviewers');

    // 17. Inactive user cannot log in (403)
    const resLoginDeact = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tlActive.email, password: defaultPassword })
    });
    assert(resLoginDeact.status === 403, '17. Deactivated user login blocked with 403 Forbidden');

    // 18. Manager reactivates Charlie (same user ID)
    const resReact = await fetch(`${baseUrl}/users/${tlActive.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ isActive: true })
    });
    assert(resReact.status === 200, '18. Manager reactivates user (200 OK)');
    const bodyReact = (await resReact.json()) as any;
    assert(bodyReact.user.id === tlActive.id && bodyReact.user.isActive === true, '19. Same user ID preserved with isActive: true');

    // 20. User appears in GET /users with isActive = true
    const resDirAfterReact = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const dirAfterReact = (await resDirAfterReact.json()) as any;
    const charlieInDirAfter = dirAfterReact.data.find((u: any) => u.id === tlActive.id);
    assert(charlieInDirAfter && charlieInDirAfter.isActive === true, '20. User appears in GET /users with isActive: true');

    // 21. User reappears in GET /users/interviewers
    const resInterviewerAfterReact = await fetch(`${baseUrl}/users/interviewers`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const intBodyAfterReact = (await resInterviewerAfterReact.json()) as any;
    assert(intBodyAfterReact.data.some((u: any) => u.id === tlActive.id), '21. Reactivated TeamLead reappears in /users/interviewers');

    // 22. User login succeeds again
    const resLoginReact = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tlActive.email, password: defaultPassword })
    });
    assert(resLoginReact.status === 200, '22. Reactivated user login succeeds (200 OK)');

    // 23. Audit logs record both events
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'User',
        entityId: tlActive.id
      }
    });
    const actions = auditLogs.map((a) => a.actionType);
    assert(actions.includes('USER_DEACTIVATED'), '23. USER_DEACTIVATED audit log recorded');
    assert(actions.includes('USER_ACTIVATED'), '24. USER_ACTIVATED audit log recorded');

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
  runUserDirectoryReactivationTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
