import { Router } from 'express';
import { Role } from '@prisma/client';
import { ReportController } from '../controllers/report.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All report endpoints require authentication and Manager role (Manager oversight)
router.use(requireAuth);
router.use(requireRole(Role.Manager));

// GET /api/v1/reports/overview
router.get('/overview', ReportController.getOverviewReport);

// GET /api/v1/reports/positions
router.get('/positions', ReportController.getPositionsReport);

// GET /api/v1/reports/pipeline
router.get('/pipeline', ReportController.getPipelineReport);

// GET /api/v1/reports/interviews
router.get('/interviews', ReportController.getInterviewsReport);

export default router;
