import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// GET /api/v1/search?q=query&type=all
router.get('/', SearchController.search);

export default router;
