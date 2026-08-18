import { Router } from 'express';
import { StageController } from '../controllers/stage.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router({ mergeParams: true });

// HR-only stage creation
router.post(
  '/',
  requireAuth,
  requireRole(Role.HR),
  StageController.createStage
);

// HR-only stage reordering (Must be registered BEFORE /:stageId)
router.patch(
  '/reorder',
  requireAuth,
  requireRole(Role.HR),
  StageController.reorderStages
);

// Read-only oversight list allowed for HR and Manager
router.get(
  '/',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  StageController.getStages
);

// Read-only oversight detail allowed for HR and Manager
router.get(
  '/:stageId',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  StageController.getStageById
);

// HR-only stage updates (name, isGating, feedbackRequiredCount)
router.patch(
  '/:stageId',
  requireAuth,
  requireRole(Role.HR),
  StageController.updateStage
);

export default router;
