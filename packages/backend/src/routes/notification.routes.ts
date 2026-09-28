// packages/backend/src/routes/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.getNotifications.bind(controller));
router.get('/unread-count', authenticate, controller.getUnreadCount.bind(controller));
router.patch('/:id/read', authenticate, controller.markAsRead.bind(controller));
router.patch('/read-all', authenticate, controller.markAllAsRead.bind(controller));
router.delete('/:id', authenticate, controller.deleteNotification.bind(controller));
router.post('/trigger-check', authenticate, authorize('ADMIN', 'OWNER'), controller.triggerExpiryCheck.bind(controller));

export default router;