import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// HR, Manager, TeamLead (scoped in service): list interviews with optional filters
router.get(
  '/',
  requireAuth,
  requireRole(Role.HR, Role.Manager, Role.TeamLead),
  InterviewController.listInterviews
);

// TeamLead: List historical interviews conducted by the authenticated interviewer
router.get(
  '/my-history',
  requireAuth,
  requireRole(Role.TeamLead),
  InterviewController.getMyHistory
);

// HR, Manager, TeamLead (assigned only — enforced in service): interview detail
router.get(
  '/:interviewId',
  requireAuth,
  requireRole(Role.HR, Role.Manager, Role.TeamLead),
  InterviewController.getInterviewById
);

// TeamLead: Accept or decline interview invitation
router.post(
  '/:interviewId/respond',
  requireAuth,
  requireRole(Role.TeamLead),
  InterviewController.respondToInvitation
);

// TeamLead: Delegate interview assignment to another eligible interviewer
router.post(
  '/:interviewId/delegate',
  requireAuth,
  requireRole(Role.TeamLead),
  InterviewController.delegateInterview
);

// HR only: update schedule/location/meetingLink
router.patch(
  '/:interviewId',
  requireAuth,
  requireRole(Role.HR),
  InterviewController.updateInterview
);

// HR only: update interview status
router.patch(
  '/:interviewId/status',
  requireAuth,
  requireRole(Role.HR),
  InterviewController.updateStatus
);

// HR only: replace all interviewers (full replace semantics)
router.put(
  '/:interviewId/interviewers',
  requireAuth,
  requireRole(Role.HR),
  InterviewController.updateInterviewers
);

export default router;
