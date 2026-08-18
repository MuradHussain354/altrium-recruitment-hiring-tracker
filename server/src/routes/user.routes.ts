import { Router } from 'express';
import { Role } from '@prisma/client';
import { UserController } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All user management endpoints require authentication and Manager role
router.use(requireAuth);
router.use(requireRole(Role.Manager));

// POST /api/v1/users - Manager creates HR or TeamLead account
router.post('/', UserController.createManagedUser);

// PATCH /api/v1/users/:id/status - Manager activates/deactivates user account
router.patch('/:id/status', UserController.setUserStatus);

export default router;
