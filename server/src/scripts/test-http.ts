import dotenv from 'dotenv';
import http from 'http';
import app from '../app';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { EmailEventType } from '@prisma/client';
import { decryptEmailToken } from '../utils/email-crypto';

dotenv.config();

/**
 * S2-45: Manager-created accounts are invitation-pending (isActive: false)
 * with no usable password until the invitation is accepted. This helper
 * exercises the REAL HTTP invitation-acceptance flow (not a DB bypass) so
 * this suite still proves the end-to-end account-provisioning path works,
 * just via its current two-step (invite -> accept) design instead of the
 * old one-step (create with password) design.
 */
async function acceptInvitationViaHttp(
  baseUrl: string,
  userId: string,
  chosenPassword: string
): Promise<{ status: number; body: any }> {
  const log = await prisma.emailDeliveryLog.findFirst({
    where: { userId, eventType: EmailEventType.AccountInvitation },
    orderBy: { createdAt: 'desc' },
  });
  if (!log) throw new Error(`No AccountInvitation outbox row found for user ${userId}`);
  const rawToken = decryptEmailToken((log.payload as any).encryptedToken);

  const res = await fetch(`${baseUrl}/auth/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: rawToken, password: chosenPassword }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function runHttpTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('==================================================');
  console.log('STARTING SPRINT 1 HTTP ENDPOINT & RBAC SUITE');
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
    // 1. Clean DB & Bootstrap Manager
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
    await bootstrapManager();

    const managerEmail = process.env.INITIAL_MANAGER_EMAIL || 'manager@altrium.com';
    const managerPassword = process.env.INITIAL_MANAGER_PASSWORD || 'ManagerPassword123!';

    // 2. HTTP POST /api/v1/auth/login (Manager Login)
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: managerEmail, password: managerPassword })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, '1. POST /api/v1/auth/login returns HTTP 200');
    assert(!!loginData.token, '2. Login response returns JWT token');
    assert(loginData.user.role === 'Manager', '3. Login user role is Manager');
    assert(loginData.user.passwordHash === undefined, '4. Password hash is NOT exposed in response');

    const managerToken = loginData.token;

    // 3. HTTP GET /api/v1/auth/me (Manager Profile)
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, '5. GET /api/v1/auth/me returns HTTP 200');
    assert(meData.user.email === managerEmail.toLowerCase(), '6. /me returns authenticated user details');

    // 4. HTTP POST /api/v1/users (Manager Invites HR Account) — S2-45: no
    // password is collected here; the account is created invitation-pending.
    const createHrRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        name: 'Jane HR',
        email: 'jane.hr@altrium.com',
        role: 'HR'
      })
    });
    const createHrData = await createHrRes.json();
    assert(createHrRes.status === 201, '7. POST /api/v1/users (Manager -> HR) returns HTTP 201 Created');
    assert(createHrData.user.createdById === loginData.user.id, '8. New user createdById matches Manager ID');
    assert(createHrData.user.isActive === false, '8b. Newly invited account is created inactive (invitation-pending)');

    const hrId = createHrData.user.id;

    // 5a. Pending (unaccepted) account cannot log in yet — S2-45 login barrier
    const pendingLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane.hr@altrium.com', password: 'AnyGuess123!' })
    });
    assert(pendingLoginRes.status === 401 || pendingLoginRes.status === 403, '9a. Pending invited account cannot log in before accepting');

    // 5b. Accept the invitation via the real HTTP endpoint (decrypting the raw
    // token from the durable outbox the same way the invited user's email
    // would deliver it) and set the chosen password.
    const hrChosenPassword = 'HrPassword123!';
    const acceptRes = await acceptInvitationViaHttp(baseUrl, hrId, hrChosenPassword);
    assert(acceptRes.status === 200, '9b. POST /auth/accept-invitation activates the account (200 OK)');
    assert(acceptRes.body.user?.isActive === true, '9c. Accepted account is now active');

    // 5c. HR Login with the password chosen during acceptance
    const hrLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane.hr@altrium.com', password: hrChosenPassword })
    });
    const hrLoginData = await hrLoginRes.json();
    assert(hrLoginRes.status === 200, '9. HR account logs in successfully after accepting its invitation');
    const hrToken = hrLoginData.token;

    // 6. RBAC Check: HR Attempts User Creation (Expect HTTP 403 Forbidden)
    const hrCreateAttempt = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized User',
        email: 'unauth@altrium.com',
        password: 'Password123!',
        role: 'TeamLead'
      })
    });
    assert(hrCreateAttempt.status === 403, '10. RBAC: HR user creation attempt returns HTTP 403 Forbidden');

    // 7. Manager Deactivates HR Account
    const deactivateRes = await fetch(`${baseUrl}/users/${hrId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(deactivateRes.status === 200, '11. Manager deactivates HR account returns HTTP 200');

    // 8. Deactivated HR Auth Rejection
    const deactivatedLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jane.hr@altrium.com', password: 'HrPassword123!' })
    });
    assert(deactivatedLogin.status === 403, '12. Deactivated user login returns HTTP 403 Forbidden');

    const deactivatedMe = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    assert(deactivatedMe.status === 403, '13. Deactivated user token request returns HTTP 403 Forbidden');

    console.log('\n==================================================');
    console.log(`HTTP SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
  } catch (error: any) {
    console.error('HTTP TEST ERROR:', error);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runHttpTests();
