import './utils/env';
import fs from 'fs';
import path from 'path';
import { prisma, bcrypt } from './utils/prisma';
import { resetState, writeState } from './utils/state';

const MANAGER_EMAIL = 'manager.qa@altrium.local';
const MANAGER_PASSWORD = 'ManagerPass!2026';

// Deletion order respects FK dependencies (children before parents).
const TABLES_IN_DELETE_ORDER = [
  'commentMention',
  'applicationComment',
  'question',
  'questionSet',
  'savedFilter',
  'applicationTag',
  'applicationInternalNote',
  'emailDeliveryLog',
  'jobAlertSubscription',
  'auditLog',
  'notification',
  'feedbackCriterionScore',
  'feedback',
  'interviewerAssignment',
  'interview',
  'application',
  'candidate',
  'stage',
  'position',
  'pipelineTemplate',
  'team',
  'user',
] as const;

async function resetDatabase() {
  for (const table of TABLES_IN_DELETE_ORDER) {
    await (prisma as any)[table].deleteMany({});
  }
}

async function bootstrapManager() {
  const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 10);
  await prisma.user.create({
    data: {
      name: 'Morgan Manager',
      email: MANAGER_EMAIL,
      passwordHash,
      role: 'Manager',
      isActive: true,
    },
  });
}

/**
 * Runs once before the whole suite. Gives every run a clean, known starting
 * database (rather than depending on whatever a previous run left behind)
 * and seeds the one account that has to exist before any UI flow can begin:
 * the Manager who provisions everyone else.
 */
export default async function globalSetup() {
  const authDir = path.resolve(__dirname, '.auth');
  const screenshotsDir = path.resolve(__dirname, 'screenshots');
  fs.rmSync(authDir, { recursive: true, force: true });
  fs.rmSync(screenshotsDir, { recursive: true, force: true });
  fs.mkdirSync(authDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  await resetDatabase();
  await bootstrapManager();
  resetState();
  writeState({ managerEmail: MANAGER_EMAIL, managerPassword: MANAGER_PASSWORD });

  await prisma.$disconnect();
}
