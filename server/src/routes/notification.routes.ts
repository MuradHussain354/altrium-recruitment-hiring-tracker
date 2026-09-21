import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// All notification endpoints require an authenticated internal user
router.use(requireAuth);

// GET /api/v1/notifications/unread-count - Get authenticated user's unread notification count
router.get('/unread-count', NotificationController.getUnreadCount);

// PATCH /api/v1/notifications/read-all - Mark all of authenticated user's notifications as read
router.patch('/read-all', NotificationController.markAllAsRead);

// PATCH /api/v1/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', NotificationController.markAsRead);

// GET /api/v1/notifications - List authenticated user's notifications
router.get('/', NotificationController.listNotifications);

// GET /api/v1/notifications/:notificationId - Get single notification for authenticated user
router.get('/:notificationId', NotificationController.getNotificationById);

export default router;
