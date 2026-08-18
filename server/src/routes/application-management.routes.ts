import { Router } from 'express';
import { ApplicationManagementController } from '../controllers/application-management.controller';
import { InterviewController } from '../controllers/interview.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// HR & Manager: list all applications with optional filters
router.get(
  '/',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationManagementController.listApplications
);

// HR & Manager: application detail view
router.get(
  '/:applicationId',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationManagementController.getApplicationById
);

// HR only: move application to another stage within same position
router.patch(
  '/:applicationId/stage',
  requireAuth,
  requireRole(Role.HR),
  ApplicationManagementController.moveStage
);

// HR only: update overall application status
router.patch(
  '/:applicationId/status',
  requireAuth,
  requireRole(Role.HR),
  ApplicationManagementController.updateStatus
);

// HR only: assign a Team to an Application
router.patch(
  '/:applicationId/team',
  requireAuth,
  requireRole(Role.HR),
  ApplicationManagementController.assignTeam
);

// HR only: schedule a new Interview for an Application
router.post(
  '/:applicationId/interviews',
  requireAuth,
  requireRole(Role.HR),
  InterviewController.createInterview
);

export default router;
