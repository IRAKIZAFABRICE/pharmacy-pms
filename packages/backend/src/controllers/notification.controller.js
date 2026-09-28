"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const client_1 = require("@prisma/client");
const notification_service_1 = __importDefault(require("../services/notification.service"));
const prisma = new client_1.PrismaClient();
class NotificationController {
    async getNotifications(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { limit = 50 } = req.query;
            const notifications = await notification_service_1.default.getUserNotifications(userId, parseInt(limit));
            const unreadCount = await notification_service_1.default.getUnreadCount(userId);
            return res.json({
                notifications,
                unreadCount,
                total: notifications.length,
            });
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const notification = await notification_service_1.default.markAsRead(id);
            return res.json({
                message: 'Notification marked as read',
                notification,
            });
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }
    async markAllAsRead(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const result = await notification_service_1.default.markAllAsRead(userId);
            return res.json({
                message: 'All notifications marked as read',
                count: result.count,
            });
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            return res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }
    async deleteNotification(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await notification_service_1.default.deleteNotification(id, userId);
            return res.json({ message: 'Notification deleted' });
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({ error: 'Failed to delete notification' });
        }
    }
    async getUnreadCount(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const count = await notification_service_1.default.getUnreadCount(userId);
            return res.json({ unreadCount: count });
        }
        catch (error) {
            console.error('Error getting unread count:', error);
            return res.status(500).json({ error: 'Failed to get unread count' });
        }
    }
    async triggerExpiryCheck(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });
            if (!user || !['ADMIN', 'OWNER'].includes(user.role)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await notification_service_1.default.checkExpiringProducts();
            await notification_service_1.default.checkStockLevels();
            return res.json({ message: 'Expiry and stock checks triggered successfully' });
        }
        catch (error) {
            console.error('Error triggering checks:', error);
            return res.status(500).json({ error: 'Failed to trigger checks' });
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notification.controller.js.map