import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// POST /api/v1/interviews/:interviewId/feedback (TeamLead only)
router.post(
  '/:interviewId/feedback',
  requireAuth,
  requireRole(Role.TeamLead),
  FeedbackController.submitFeedback
);

// GET /api/v1/interviews/:interviewId/feedback (HR, Manager, TeamLead scoped)
router.get(
  '/:interviewId/feedback',
  requireAuth,
  requireRole(Role.HR, Role.Manager, Role.TeamLead),
  FeedbackController.getFeedbacks
);

export default router;
