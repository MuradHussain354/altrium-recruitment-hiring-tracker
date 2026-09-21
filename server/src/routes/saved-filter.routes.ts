import { Router } from 'express';
import { SavedFilterController } from '../controllers/saved-filter.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Saved filters are private per user — all authenticated users can manage their own
router.use(requireAuth);

router.post('/', SavedFilterController.createFilter);
router.get('/', SavedFilterController.getMyFilters);
router.put('/:filterId', SavedFilterController.updateFilter);
router.delete('/:filterId', SavedFilterController.deleteFilter);

export default router;
