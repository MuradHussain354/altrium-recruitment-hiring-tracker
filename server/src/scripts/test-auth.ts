import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { bootstrapManager } from './seed';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Role } from '@prisma/client';
import { AppError } from '../utils/errors';

dotenv.config();

async function runAuthTests() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to execute test cleanup/suite in production environment!');
  }

  console.log('==================================================');
  console.log('STARTING SPRINT 1 AUTH & RBAC VERIFICATION SUITE');
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

  try {
    // Clean up test data if any from previous runs
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});

    // Test 1: Manager Bootstrap
    await bootstrapManager();
    const managerInDb = await prisma.user.findFirst({ where: { role: Role.Manager } });
    assert(!!managerInDb, '1. Initial Manager account bootstrapped in PostgreSQL');
    assert(Boolean(managerInDb?.passwordHash.startsWith('$2')), '2. Manager password stored as bcrypt hash');
    assert(managerInDb?.createdById === null, '3. Manager createdById is null');

    // Test 2: Idempotent Bootstrap
    await bootstrapManager();
    const managerCount = await prisma.user.count({ where: { role: Role.Manager } });
    assert(managerCount === 1, '4. Bootstrap is idempotent (no duplicate Managers created)');

    const testPassword = process.env.INITIAL_MANAGER_PASSWORD || 'ManagerPassword123!';
    const testEmail = process.env.INITIAL_MANAGER_EMAIL || 'manager@altrium.com';

    // Test 3: Valid Login
    const loginRes = await AuthService.login({ email: testEmail, password: testPassword });
    assert(!!loginRes.token, '5. Login returns JWT token');
    assert(loginRes.user.email === testEmail.toLowerCase(), '6. Login returns correct user email');
    assert((loginRes.user as any).passwordHash === undefined, '7. Login response DOES NOT contain passwordHash');

    // Test 4: Invalid Password
    try {
      await AuthService.login({ email: testEmail, password: 'WrongPassword999!' });
      assert(false, '8. Wrong password should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 401, '8. Wrong password returns 401 Unauthorized');
    }

    // Test 5: Unknown Email
    try {
      await AuthService.login({ email: 'nonexistent@altrium.com', password: testPassword });
      assert(false, '9. Unknown email should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 401, '9. Unknown email returns 401 Unauthorized');
    }

    // Test 6: Get Current User (/me)
    const meRes = await AuthService.getMe(managerInDb!.id);
    assert(meRes.id === managerInDb!.id, '10. AuthService.getMe returns correct Manager profile');
    assert((meRes as any).passwordHash === undefined, '11. getMe DOES NOT expose passwordHash');

    // Test 7: Manager Creates HR User
    const hrEmail = 'hr.test@altrium.com';
    const hrUser = await UserService.createManagedUser(managerInDb!.id, {
      name: 'Test HR',
      email: hrEmail,
      password: 'HrPassword123!',
      role: Role.HR
    });
    assert(hrUser.role === Role.HR, '12. Manager successfully created HR user');
    assert(hrUser.createdById === managerInDb!.id, '13. HR user createdById preserves Manager ID lineage');

    // Test 8: Manager Creates TeamLead User
    const tlEmail = 'teamlead.test@altrium.com';
    const tlUser = await UserService.createManagedUser(managerInDb!.id, {
      name: 'Test TeamLead',
      email: tlEmail,
      password: 'TlPassword123!',
      role: Role.TeamLead
    });
    assert(tlUser.role === Role.TeamLead, '14. Manager successfully created TeamLead user');

    // Test 9: Duplicate Email Registration Rejection
    try {
      await UserService.createManagedUser(managerInDb!.id, {
        name: 'Duplicate HR',
        email: hrEmail,
        password: 'HrPassword123!',
        role: Role.HR
      });
      assert(false, '15. Duplicate email should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400, '15. Duplicate email returns 400 Bad Request');
    }

    // Test 10: HR Account Login
    const hrLoginRes = await AuthService.login({ email: hrEmail, password: 'HrPassword123!' });
    assert(hrLoginRes.user.role === Role.HR, '16. HR user successfully logs in');

    // Test 11: Account Deactivation
    const deactivatedHr = await UserService.setUserStatus(managerInDb!.id, hrUser.id, { isActive: false });
    assert(deactivatedHr.isActive === false, '17. Manager successfully deactivates HR account');

    // Test 12: Deactivated User Cannot Login
    try {
      await AuthService.login({ email: hrEmail, password: 'HrPassword123!' });
      assert(false, '18. Deactivated user login should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 403, '18. Deactivated user login returns 403 Forbidden');
    }

    // Test 13: Deactivated User /me Rejection
    try {
      await AuthService.getMe(hrUser.id);
      assert(false, '19. Deactivated user getMe should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 401, '19. Deactivated user getMe returns 401 Unauthorized');
    }

    // Test 14: Manager Re-activates Account
    const reactivatedHr = await UserService.setUserStatus(managerInDb!.id, hrUser.id, { isActive: true });
    assert(reactivatedHr.isActive === true, '20. Manager successfully reactivates HR account');

    // Test 15: Manager Self-Deactivation Prevention
    try {
      await UserService.setUserStatus(managerInDb!.id, managerInDb!.id, { isActive: false });
      assert(false, '21. Self-deactivation should throw error');
    } catch (err: any) {
      assert(err instanceof AppError && err.statusCode === 400, '21. Manager self-deactivation returns 400 Bad Request');
    }

    // Test 16: Audit Log Event Generation
    const auditLogs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'asc' } });
    assert(auditLogs.length >= 3, '22. Audit logs recorded for account operations');
    const actions = auditLogs.map(a => a.actionType);
    assert(actions.includes('USER_CREATED') && actions.includes('USER_DEACTIVATED') && actions.includes('USER_ACTIVATED'), '23. Audit logs record USER_CREATED, USER_DEACTIVATED, USER_ACTIVATED');

    console.log('\n==================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
  } catch (error: any) {
    console.error('UNEXPECTED TEST ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests();
