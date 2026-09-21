import { Router } from 'express';
import { QuestionSetController } from '../controllers/question-set.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);

// HR, TeamLead, Manager can view question sets
router.get('/', QuestionSetController.getQuestionSets);
router.get('/:id', QuestionSetController.getQuestionSetById);

// HR & Manager can create, update, duplicate, and delete question sets
router.post(
  '/',
  requireRole(Role.HR, Role.Manager),
  QuestionSetController.createQuestionSet
);

router.put(
  '/:id',
  requireRole(Role.HR, Role.Manager),
  QuestionSetController.updateQuestionSet
);

router.post(
  '/:id/duplicate',
  requireRole(Role.HR, Role.Manager),
  QuestionSetController.duplicateQuestionSet
);

router.delete(
  '/:id',
  requireRole(Role.HR, Role.Manager),
  QuestionSetController.deleteQuestionSet
);

export default router;
