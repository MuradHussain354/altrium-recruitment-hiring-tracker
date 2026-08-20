import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All user endpoints require authentication
router.use(requireAuth);

// GET /api/v1/users/interviewers - List active HR and TeamLead interviewers (HR and Manager)
router.get(
  '/interviewers',
  requireRole(Role.HR, Role.Manager),
  UserController.getEligibleInterviewers
);

// POST /api/v1/users - Manager creates HR or TeamLead account (Manager only)
router.post(
  '/',
  requireRole(Role.Manager),
  UserController.createManagedUser
);

// PATCH /api/v1/users/:id/status - Manager activates/deactivates user account (Manager only)
router.patch(
  '/:id/status',
  requireRole(Role.Manager),
  UserController.setUserStatus
);

export default router;
