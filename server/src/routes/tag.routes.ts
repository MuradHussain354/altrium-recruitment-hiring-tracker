import { Router } from 'express';
import { ApplicationTagController } from '../controllers/application-tag.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// GET /api/v1/tags (distinct tags)
router.get('/', ApplicationTagController.getAllDistinctTags);

export default router;
