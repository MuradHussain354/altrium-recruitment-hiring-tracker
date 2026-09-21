import { Router } from 'express';
import { ApplicationManagementController } from '../controllers/application-management.controller';
import { InterviewController } from '../controllers/interview.controller';
import { ApplicationNoteController } from '../controllers/application-note.controller';
import { ApplicationTagController } from '../controllers/application-tag.controller';
import { CommentController } from '../controllers/comment.controller';
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

// HR, Manager, TeamLead: Consolidated feedback & deterministic scorecard
router.get(
  '/:applicationId/consolidated-feedback',
  requireAuth,
  requireRole(Role.HR, Role.Manager, Role.TeamLead),
  InterviewController.getConsolidatedFeedback
);

// ── Private Internal Notes (HR & Manager only) ─────────────────────────────
router.post(
  '/:applicationId/notes',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationNoteController.addNote
);

router.get(
  '/:applicationId/notes',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationNoteController.getNotes
);

router.delete(
  '/:applicationId/notes/:noteId',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationNoteController.deleteNote
);

// ── Application Tags ────────────────────────────────────────────────────────
router.post(
  '/:applicationId/tags',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationTagController.addTag
);

router.get(
  '/:applicationId/tags',
  requireAuth,
  ApplicationTagController.getTags
);

router.delete(
  '/:applicationId/tags/:tagId',
  requireAuth,
  requireRole(Role.HR, Role.Manager),
  ApplicationTagController.removeTag
);

// ── Internal Application Comments & @mentions ──────────────────────────────
router.post(
  '/:applicationId/comments',
  requireAuth,
  CommentController.addComment
);

router.get(
  '/:applicationId/comments',
  requireAuth,
  CommentController.getComments
);

router.delete(
  '/:applicationId/comments/:commentId',
  requireAuth,
  CommentController.deleteComment
);

// ── Offer Approval Workflow ────────────────────────────────────────────────
router.post(
  '/:applicationId/offer/request',
  requireAuth,
  requireRole(Role.HR),
  ApplicationManagementController.requestOfferApproval
);

router.post(
  '/:applicationId/offer/decide',
  requireAuth,
  requireRole(Role.Manager),
  ApplicationManagementController.decideOfferApproval
);

export default router;
