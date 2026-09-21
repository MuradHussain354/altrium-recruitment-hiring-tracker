import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(requireRole(Role.HR, Role.Manager));

// GET /api/v1/applications/export/excel
router.get('/excel', ExportController.exportExcel);

// GET /api/v1/applications/export/pdf
router.get('/pdf', ExportController.exportPdf);

export default router;
