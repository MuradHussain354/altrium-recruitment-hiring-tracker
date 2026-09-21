import { Router } from 'express';
import { BulkController } from '../controllers/bulk.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// HR & Manager: Bulk change status
router.post(
  '/status',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  BulkController.bulkChangeStatus
);

// HR only: Bulk change stage with per-application gating evaluation
router.post(
  '/stage',
  requireAuth,
  requireRole(Role.HR),
  BulkController.bulkChangeStage
);

// HR only: Bulk assign team
router.post(
  '/team',
  requireAuth,
  requireRole(Role.HR),
  BulkController.bulkAssignTeam
);

export default router;
