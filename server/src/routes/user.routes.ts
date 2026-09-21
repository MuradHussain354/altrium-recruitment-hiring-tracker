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

// GET /api/v1/users - List all managed staff (active and inactive) for staff directory (Manager only)
router.get(
  '/',
  requireRole(Role.Manager),
  UserController.listManagedUsers
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

// POST /api/v1/users/:userId/resend-invitation - Manager reissues a pending invitation (Manager only)
router.post(
  '/:userId/resend-invitation',
  requireRole(Role.Manager),
  UserController.resendInvitation
);

export default router;
