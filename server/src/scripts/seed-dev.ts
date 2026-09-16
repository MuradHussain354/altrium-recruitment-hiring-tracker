import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { Role, PositionStatus, CandidateSource } from '@prisma/client';
import { UserService } from '../services/user.service';
import { TeamService } from '../services/team.service';
import { PositionService } from '../services/position.service';
import { StageService } from '../services/stage.service';
import { ApplicationService } from '../services/application.service';
import { JobAlertService } from '../services/job-alert.service';

/**
 * Validates environment and database connection safety guards.
 * Refuses execution if NODE_ENV is production or if DATABASE_URL does not point to localhost.
 */
function assertSafetyGuards(): void {
  // 1. Enforce non-production environment
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY ERROR] NODE_ENV is set to "production". Refusing to execute development seed script!');
  }

  // 2. Read and validate DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('[SECURITY ERROR] DATABASE_URL environment variable is missing.');
  }

  let parsed: URL;
  try {
    parsed = new URL(dbUrl);
  } catch (err: any) {
    throw new Error(`[SECURITY ERROR] DATABASE_URL is malformed: ${err.message}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // 3. Reject any remote host or Neon database strings
  if (!isLocalhost || dbUrl.includes('neon.tech') || dbUrl.includes('neondb')) {
    throw new Error(
      `[SECURITY ERROR] DATABASE_URL does not point to a local PostgreSQL instance (detected hostname: "${hostname}"). ` +
      'Refusing to run to protect remote or production databases!'
    );
  }
}

/**
 * Executes development-only database seed with full idempotency and foreign-key integrity.
 */
export async function seedDev(): Promise<void> {
  assertSafetyGuards();

  console.log('[SEED-DEV] Starting development database seeding (local PostgreSQL)...');

  // ---------------------------------------------------------------------------
  // 1. MANAGER
  // ---------------------------------------------------------------------------
  let manager = await prisma.user.findUnique({
    where: { email: 'manager@altrium.local' }
  });
  let managerCreated = false;

  if (!manager) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Manager123!', saltRounds);
    manager = await prisma.user.create({
      data: {
        name: 'Development Manager',
        email: 'manager@altrium.local',
        passwordHash,
        role: Role.Manager,
        isActive: true,
        createdById: null,
        teamId: null
      }
    });
    managerCreated = true;
  }

  // ---------------------------------------------------------------------------
  // 2. TEAMS
  // ---------------------------------------------------------------------------
  let frontendTeam = await prisma.team.findFirst({
    where: { name: { equals: 'Frontend Engineering', mode: 'insensitive' } }
  });
  let frontendTeamCreated = false;

  if (!frontendTeam) {
    const createdTeam = await TeamService.createTeam(manager.id, { name: 'Frontend Engineering' });
    frontendTeam = await prisma.team.findUniqueOrThrow({ where: { id: createdTeam.id } });
    frontendTeamCreated = true;
  }

  let platformTeam = await prisma.team.findFirst({
    where: { name: { equals: 'Platform Infrastructure', mode: 'insensitive' } }
  });
  let platformTeamCreated = false;

  if (!platformTeam) {
    const createdTeam = await TeamService.createTeam(manager.id, { name: 'Platform Infrastructure' });
    platformTeam = await prisma.team.findUniqueOrThrow({ where: { id: createdTeam.id } });
    platformTeamCreated = true;
  }

  // ---------------------------------------------------------------------------
  // 3. HR USER
  // ---------------------------------------------------------------------------
  let hrUser = await prisma.user.findUnique({
    where: { email: 'hr@altrium.local' }
  });
  let hrUserCreated = false;

  if (!hrUser) {
    const safeProfile = await UserService.createManagedUser(manager.id, {
      name: 'Development HR',
      email: 'hr@altrium.local',
      password: 'HrPassword123!',
      role: Role.HR,
      teamId: frontendTeam.id
    });
    hrUser = await prisma.user.findUniqueOrThrow({ where: { id: safeProfile.id } });
    hrUserCreated = true;
  }

  // ---------------------------------------------------------------------------
  // 4. TEAM LEAD
  // ---------------------------------------------------------------------------
  let teamLeadUser = await prisma.user.findUnique({
    where: { email: 'lead.frontend@altrium.local' }
  });
  let teamLeadCreated = false;

  if (!teamLeadUser) {
    const safeProfile = await UserService.createManagedUser(manager.id, {
      name: 'Frontend Team Lead',
      email: 'lead.frontend@altrium.local',
      password: 'LeadPassword123!',
      role: Role.TeamLead,
      teamId: frontendTeam.id
    });
    teamLeadUser = await prisma.user.findUniqueOrThrow({ where: { id: safeProfile.id } });
    teamLeadCreated = true;
  }

  // ---------------------------------------------------------------------------
  // 5. OPEN POSITION #1: Frontend Software Engineer
  // ---------------------------------------------------------------------------
  let pos1 = await prisma.position.findFirst({
    where: { title: 'Frontend Software Engineer', department: 'Engineering' },
    include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
  });
  let pos1Created = false;

  if (!pos1) {
    const created = await PositionService.createPosition(hrUser.id, {
      title: 'Frontend Software Engineer',
      department: 'Engineering',
      description: 'Build and maintain modern web applications using React, TypeScript, and related technologies.',
      requiredSkills: 'React, TypeScript, JavaScript, HTML, CSS',
      headcount: 2
    });

    await StageService.createStage(hrUser.id, created.id, { name: 'Applied', sequenceOrder: 1 });
    await StageService.createStage(hrUser.id, created.id, { name: 'Technical Screening', sequenceOrder: 2 });
    await StageService.createStage(hrUser.id, created.id, { name: 'Team Interview', sequenceOrder: 3 });

    const openPos = await PositionService.updatePositionStatus(hrUser.id, created.id, PositionStatus.Open);
    pos1 = await prisma.position.findUniqueOrThrow({
      where: { id: openPos.id },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });
    pos1Created = true;
  }

  // ---------------------------------------------------------------------------
  // 6. OPEN POSITION #2: Cloud Infrastructure Engineer
  // ---------------------------------------------------------------------------
  let pos2 = await prisma.position.findFirst({
    where: { title: 'Cloud Infrastructure Engineer', department: 'Cloud & Infrastructure' },
    include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
  });
  let pos2Created = false;

  if (!pos2) {
    const created = await PositionService.createPosition(hrUser.id, {
      title: 'Cloud Infrastructure Engineer',
      department: 'Cloud & Infrastructure',
      description: 'Design and maintain reliable cloud infrastructure and deployment environments.',
      requiredSkills: 'AWS, Linux, Networking, Docker',
      headcount: 1
    });

    await StageService.createStage(hrUser.id, created.id, { name: 'Applied', sequenceOrder: 1 });
    await StageService.createStage(hrUser.id, created.id, { name: 'Technical Screening', sequenceOrder: 2 });
    await StageService.createStage(hrUser.id, created.id, { name: 'Final Interview', sequenceOrder: 3 });

    const openPos = await PositionService.updatePositionStatus(hrUser.id, created.id, PositionStatus.Open);
    pos2 = await prisma.position.findUniqueOrThrow({
      where: { id: openPos.id },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });
    pos2Created = true;
  }

  // ---------------------------------------------------------------------------
  // 7. DRAFT POSITION: Data Analyst
  // ---------------------------------------------------------------------------
  let posDraft = await prisma.position.findFirst({
    where: { title: 'Data Analyst', department: 'Data & Analytics' },
    include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
  });
  let posDraftCreated = false;

  if (!posDraft) {
    const created = await PositionService.createPosition(hrUser.id, {
      title: 'Data Analyst',
      department: 'Data & Analytics',
      description: 'Analyze business data and create useful reports and dashboards.',
      requiredSkills: 'SQL, Power BI, Python',
      headcount: 1
    });

    await StageService.createStage(hrUser.id, created.id, { name: 'Applied', sequenceOrder: 1 });

    posDraft = await prisma.position.findUniqueOrThrow({
      where: { id: created.id },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });
    posDraftCreated = true;
  }

  // ---------------------------------------------------------------------------
  // 8. SAMPLE CANDIDATES & APPLICATIONS
  // ---------------------------------------------------------------------------
  let app1Created = false;
  const cand1 = await prisma.candidate.findFirst({
    where: { email: 'alice.dev@altrium.local' }
  });
  const app1 = cand1
    ? await prisma.application.findUnique({
        where: { candidateId_positionId: { candidateId: cand1.id, positionId: pos1.id } }
      })
    : null;

  if (!app1) {
    await ApplicationService.submitApplication({
      name: 'Alice Johnson',
      email: 'alice.dev@altrium.local',
      phone: '+94770000001',
      resumeUrl: 'https://example.com/alice-resume.pdf',
      linkedInUrl: 'https://www.linkedin.com/in/alice-development',
      source: CandidateSource.Direct,
      positionId: pos1.id
    });
    app1Created = true;
  }

  let app2Created = false;
  const cand2 = await prisma.candidate.findFirst({
    where: { email: 'daniel.cloud@altrium.local' }
  });
  const app2 = cand2
    ? await prisma.application.findUnique({
        where: { candidateId_positionId: { candidateId: cand2.id, positionId: pos2.id } }
      })
    : null;

  if (!app2) {
    await ApplicationService.submitApplication({
      name: 'Daniel Perera',
      email: 'daniel.cloud@altrium.local',
      phone: '+94770000002',
      resumeUrl: 'https://example.com/daniel-resume.pdf',
      linkedInUrl: 'https://www.linkedin.com/in/daniel-cloud',
      source: CandidateSource.Direct,
      positionId: pos2.id
    });
    app2Created = true;
  }

  // ---------------------------------------------------------------------------
  // 9. JOB ALERT SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  await JobAlertService.subscribe({
    email: 'alerts@altrium.local',
    department: 'Engineering',
    keyword: 'Engineer'
  });

  await JobAlertService.subscribe({
    email: 'cloud-alerts@altrium.local',
    department: 'Cloud & Infrastructure',
    keyword: 'Cloud'
  });

  const totalAlerts = await prisma.jobAlertSubscription.count({
    where: {
      email: { in: ['alerts@altrium.local', 'cloud-alerts@altrium.local'] },
      isActive: true
    }
  });

  // ---------------------------------------------------------------------------
  // 10. OUTPUT SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n[SEED-DEV] Development database seed completed.\n');
  console.log('Manager:');
  console.log(`  manager@altrium.local (${managerCreated ? 'created' : 'already existed'})`);
  console.log('\nTeams:');
  console.log(`  Frontend Engineering (${frontendTeamCreated ? 'created' : 'already existed'})`);
  console.log(`  Platform Infrastructure (${platformTeamCreated ? 'created' : 'already existed'})`);
  console.log('\nHR:');
  console.log(`  hr@altrium.local (${hrUserCreated ? 'created' : 'already existed'})`);
  console.log('\nTeam Lead:');
  console.log(`  lead.frontend@altrium.local (${teamLeadCreated ? 'created' : 'already existed'})`);
  console.log('\nOpen positions:');
  console.log(`  Frontend Software Engineer (${pos1Created ? 'created' : 'already existed'})`);
  console.log(`  Cloud Infrastructure Engineer (${pos2Created ? 'created' : 'already existed'})`);
  console.log('\nDraft position:');
  console.log(`  Data Analyst (${posDraftCreated ? 'created' : 'already existed'})`);
  console.log('\nApplications:');
  console.log(`  alice.dev@altrium.local -> Frontend Software Engineer (${app1Created ? 'created' : 'already existed'})`);
  console.log(`  daniel.cloud@altrium.local -> Cloud Infrastructure Engineer (${app2Created ? 'created' : 'already existed'})`);
  console.log('\nJob alerts:');
  console.log(`  ${totalAlerts} active subscriptions verified (tokens kept confidential)\n`);
}

if (require.main === module) {
  seedDev()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('\n[SEED-DEV ERROR]', e.message);
      await prisma.$disconnect();
      process.exit(1);
    });
}
