// packages/backend/src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import notificationService from '../services/notification.service';

const prisma = new PrismaClient();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { limit = 50 } = req.query;
      const notifications = await notificationService.getUserNotifications(
        userId,
        parseInt(limit as string)
      );
      const unreadCount = await notificationService.getUnreadCount(userId);

      return res.json({
        notifications,
        unreadCount,
        total: notifications.length,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const notification = await notificationService.markAsRead(id);
      return res.json({
        message: 'Notification marked as read',
        notification,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await notificationService.markAllAsRead(userId);
      return res.json({
        message: 'All notifications marked as read',
        count: result.count,
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await notificationService.deleteNotification(id, userId);
      return res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const count = await notificationService.getUnreadCount(userId);
      return res.json({ unreadCount: count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return res.status(500).json({ error: 'Failed to get unread count' });
    }
  }

  async triggerExpiryCheck(req: AuthRequest, res: Response) {
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

      await notificationService.checkExpiringProducts();
      await notificationService.checkStockLevels();

      return res.json({ message: 'Expiry and stock checks triggered successfully' });
    } catch (error) {
      console.error('Error triggering checks:', error);
      return res.status(500).json({ error: 'Failed to trigger checks' });
    }
  }
}