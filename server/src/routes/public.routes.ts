import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { ApplicationController } from '../controllers/application.controller';
import { uploadCvMiddleware } from '../middlewares/upload.middleware';

const router = Router();

// Open public endpoints (no authentication required)
router.get('/positions', PositionController.getPublicPositions);
router.get('/positions/:id', PositionController.getPublicPositionById);
router.post('/applications', uploadCvMiddleware, ApplicationController.submitApplication);

export default router;
