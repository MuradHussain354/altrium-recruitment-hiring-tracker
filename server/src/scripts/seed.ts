import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../config/prisma';

dotenv.config();

export async function bootstrapManager(): Promise<void> {
  const name = process.env.INITIAL_MANAGER_NAME || 'System Manager';
  const email = process.env.INITIAL_MANAGER_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_MANAGER_PASSWORD;

  if (!email || !password || email === 'REPLACE_WITH_MANAGER_EMAIL' || password === 'REPLACE_WITH_SECURE_PASSWORD') {
    console.log('[SEED] Skipping Manager bootstrap: INITIAL_MANAGER_EMAIL or INITIAL_MANAGER_PASSWORD not set in environment.');
    return;
  }

  // Check if any Manager user or matching email exists
  const existingManager = await prisma.user.findFirst({
    where: {
      OR: [
        { role: Role.Manager },
        { email: email }
      ]
    }
  });

  if (existingManager) {
    console.log('[SEED] Manager account already exists. Skipping bootstrap.');
    return;
  }

  // Hash password safely
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create initial Manager user
  const manager = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.Manager,
      isActive: true,
      createdById: null
    }
  });

  console.log(`[SEED] Initial Manager account bootstrapped successfully (ID: ${manager.id}).`);
}

if (require.main === module) {
  bootstrapManager()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('[SEED ERROR]', e.message);
      await prisma.$disconnect();
      process.exit(1);
    });
}
