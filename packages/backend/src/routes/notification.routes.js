"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/notification.routes.ts
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new notification_controller_1.NotificationController();
router.get('/', auth_middleware_1.authenticate, controller.getNotifications.bind(controller));
router.get('/unread-count', auth_middleware_1.authenticate, controller.getUnreadCount.bind(controller));
router.patch('/:id/read', auth_middleware_1.authenticate, controller.markAsRead.bind(controller));
router.patch('/read-all', auth_middleware_1.authenticate, controller.markAllAsRead.bind(controller));
router.delete('/:id', auth_middleware_1.authenticate, controller.deleteNotification.bind(controller));
router.post('/trigger-check', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'OWNER'), controller.triggerExpiryCheck.bind(controller));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map