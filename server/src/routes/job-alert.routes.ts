import { Router } from 'express';
import { JobAlertController } from '../controllers/job-alert.controller';

const router = Router();

// Open public job alert endpoints (no authentication required)
router.post('/', JobAlertController.subscribe);
// Unsubscribe via POST only — GET must not mutate subscription state
router.post('/unsubscribe', JobAlertController.unsubscribe);

export default router;
