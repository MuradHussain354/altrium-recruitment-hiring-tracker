import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/altrium_recruitment?schema=public';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_for_batch3d_verification_12345';
}

import prisma from '../config/prisma';
import app from '../app';
import http from 'http';
import { signToken, verifyToken } from '../utils/jwt';
import { Role } from '@prisma/client';

let server: http.Server;
let baseUrl: string;

function req(path: string, options: { method?: string; body?: any; token?: string } = {}) {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  return fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

async function run() {
  console.log('======================================================================');
  console.log('STARTING SPRINT 2 BATCH 3D — ACCESS LOG API TEST SUITE');
  console.log('======================================================================\n');

  // Set up in-memory mock store
  const store = {
    users: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  const hrUser = {
    id: 'user-hr-1',
    name: 'HR Bob',
    email: 'bob@example.com',
    role: Role.HR,
    isActive: true,
    teamId: null,
  };
  const managerUser = {
    id: 'user-manager-1',
    name: 'Manager Alice',
    email: 'alice@example.com',
    role: Role.Manager,
    isActive: true,
    teamId: null,
  };
  store.users.set(hrUser.id, hrUser);
  store.users.set(managerUser.id, managerUser);

  // Populate some sample audit logs
  for (let i = 1; i <= 15; i++) {
    const logId = `log-${i}`;
    store.auditLogs.set(logId, {
      id: logId,
      actorId: i % 2 === 0 ? managerUser.id : hrUser.id,
      actionType: i % 3 === 0 ? 'AUTH_LOGIN_SUCCESS' : '2FA_SUCCESS',
      entityType: 'User',
      entityId: hrUser.id,
      details: { sample: `meta-${i}` },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 TestBrowser',
      timestamp: new Date(Date.now() - i * 60000),
    });
  }

  // Mock prisma.user
  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.id) return store.users.get(where.id) || null;
    return null;
  };

  // Mock prisma.auditLog
  (prisma.auditLog as any).count = async ({ where }: any = {}) => {
    let count = 0;
    for (const log of store.auditLogs.values()) {
      if (where?.actionType && log.actionType !== where.actionType) continue;
      if (where?.actorId && log.actorId !== where.actorId) continue;
      count++;
    }
    return count;
  };

  (prisma.auditLog as any).findMany = async ({ where, skip = 0, take = 50 }: any = {}) => {
    let list: any[] = [];
    for (const log of store.auditLogs.values()) {
      if (where?.actionType && log.actionType !== where.actionType) continue;
      if (where?.actorId && log.actorId !== where.actorId) continue;
      const actor = log.actorId ? store.users.get(log.actorId) : null;
      list.push({
        ...log,
        actor: actor ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role } : null,
      });
    }
    return list.slice(skip, skip + take);
  };

  server = app.listen(0);
  const addr = server.address() as any;
  baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. Unauthenticated request should be rejected with 401
    const resUnauth = await req('/api/v1/audit-logs');
    assert(resUnauth.status === 401, '1.1 Unauthenticated request returns 401');

    // 2. Non-Manager role (HR) should be rejected with 403
    const hrToken = signToken({
      id: hrUser.id,
      email: hrUser.email,
      role: hrUser.role,
    });
    const resForbidden = await req('/api/v1/audit-logs', { token: hrToken });
    assert(resForbidden.status === 403, '1.2 Non-Manager role returns 403 Forbidden');

    // 3. Manager role should succeed with 200 OK
    const managerToken = signToken({
      id: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
    });
    const resManager = await req('/api/v1/audit-logs', { token: managerToken });
    assert(resManager.status === 200, '1.3 Manager role returns 200 OK');
    const bodyManager = await resManager.json() as any;
    assert(Array.isArray(bodyManager.data), '1.3 Response data is an array');
    assert(bodyManager.meta.total === 15, '1.3 Meta total is 15');
    assert(bodyManager.meta.page === 1, '1.3 Default page is 1');
    assert(bodyManager.meta.limit === 50, '1.3 Default limit is 50');

    // 4. Test pagination query params
    const resPagination = await req('/api/v1/audit-logs?page=2&limit=5', { token: managerToken });
    assert(resPagination.status === 200, '2.1 Pagination query returns 200 OK');
    const bodyPagination = await resPagination.json() as any;
    assert(bodyPagination.meta.page === 2, '2.1 Meta page is 2');
    assert(bodyPagination.meta.limit === 5, '2.1 Meta limit is 5');
    assert(bodyPagination.data.length === 5, '2.1 Page 2 returns 5 items');

    // 5. Test actionType filter
    const resFilter = await req('/api/v1/audit-logs?actionType=AUTH_LOGIN_SUCCESS', { token: managerToken });
    assert(resFilter.status === 200, '3.1 ActionType filter returns 200 OK');
    const bodyFilter = await resFilter.json() as any;
    assert(bodyFilter.data.length === 5, '3.1 Returns matching count of 5 for AUTH_LOGIN_SUCCESS');
    const allMatch = bodyFilter.data.every((entry: any) => entry.actionType === 'AUTH_LOGIN_SUCCESS');
    assert(allMatch, '3.1 All returned entries match filtered actionType');

    // 6. Test actor relation in logs
    const hasActor = bodyManager.data.some((entry: any) => entry.actor && entry.actor.email === managerUser.email);
    assert(hasActor, '4.1 Actor relation is properly joined and populated');

    console.log('\n======================================================================');
    console.log('ACCESS LOG TEST SUITE COMPLETE: 9 PASSED, 0 FAILED');
    console.log('======================================================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  prisma.$disconnect();
  process.exit(1);
});
