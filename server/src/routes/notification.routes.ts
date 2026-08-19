import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// All notification endpoints require an authenticated internal user
router.use(requireAuth);

// GET /api/v1/notifications - List authenticated user's notifications
router.get('/', NotificationController.listNotifications);

// GET /api/v1/notifications/:notificationId - Get single notification for authenticated user
router.get('/:notificationId', NotificationController.getNotificationById);

export default router;
