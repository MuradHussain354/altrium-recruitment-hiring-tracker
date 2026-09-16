import { Router } from 'express';
import { PositionController } from '../controllers/position.controller';
import { ApplicationController } from '../controllers/application.controller';
import { uploadCvMiddleware } from '../middlewares/upload.middleware';
import jobAlertRoutes from './job-alert.routes';

const router = Router();

// Open public endpoints (no authentication required)
router.get('/positions', PositionController.getPublicPositions);
router.get('/positions/:id', PositionController.getPublicPositionById);

// Public Application Tracking
router.post('/applications/track', ApplicationController.trackApplication);

// Public Candidate Application Submission
router.post('/applications', uploadCvMiddleware, ApplicationController.submitApplication);

// Public Job Alerts
router.use('/job-alerts', jobAlertRoutes);

export default router;
