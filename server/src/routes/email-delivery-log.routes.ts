import { Router } from 'express';
import { Role } from '@prisma/client';
import { EmailDeliveryLogController } from '../controllers/email-delivery-log.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/email-logs - Manager-only email outbox visibility (S2-47)
router.get('/', requireAuth, requireRole(Role.Manager), EmailDeliveryLogController.listLogs);

export default router;
