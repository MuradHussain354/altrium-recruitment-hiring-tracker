import { Router } from 'express';
import { AuditLogController } from '../controllers/audit-log.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/audit-logs — Manager only (B3-06)
router.get('/', requireAuth, requireRole('Manager'), AuditLogController.listLogs);

export default router;
