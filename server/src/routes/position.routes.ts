import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Internal position management endpoints
// Write operations (POST, PATCH) restricted to HR only
router.post(
  '/',
  requireAuth,
  requireRole(Role.HR),
  PositionController.createPosition
);

router.patch(
  '/:id',
  requireAuth,
  requireRole(Role.HR),
  PositionController.updatePosition
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(Role.HR),
  PositionController.updatePositionStatus
);

// Read-only oversight endpoints allowed for HR and Manager
router.get(
  '/',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  PositionController.getPositions
);

router.get(
  '/:id',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  PositionController.getPositionById
);

export default router;
