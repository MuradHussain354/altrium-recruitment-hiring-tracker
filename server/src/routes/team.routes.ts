import { Router } from 'express';
import { TeamController } from '../controllers/team.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/v1/teams - List all teams for HR & Manager lookup
router.get(
  '/',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  TeamController.listTeams
);

// POST /api/v1/teams - Create a new team (Manager only)
router.post(
  '/',
  requireAuth,
  requireRole(Role.Manager),
  TeamController.createTeam
);

export default router;
