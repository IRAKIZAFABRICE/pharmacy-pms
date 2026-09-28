// packages/backend/src/services/notification.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  action?: string;
  data?: any;
}

export class NotificationService {
  async createNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          severity: data.severity || 'info',
          action: data.action || null,
          data: data.data || null,
        },
      });
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  async sendToAllAdmins(data: Omit<NotificationData, 'userId'>) {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'OWNER', 'PHARMACIST'] },
        isActive: true,
      },
      select: { id: true },
    });

    const notifications = [];
    for (const admin of admins) {
      const notif = await this.createNotification({
        ...data,
        userId: admin.id,
      });
      if (notif) notifications.push(notif);
    }
    return notifications;
  }

  async sendToUser(userId: string, data: Omit<NotificationData, 'userId'>) {
    return this.createNotification({
      ...data,
      userId,
    });
  }

  async getUserNotifications(userId: string, limit: number = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  // ==================== EVENT TRIGGERS ====================

  async checkExpiringProducts() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringBatches = await prisma.batch.findMany({
      where: {
        isActive: true,
        quantity: { gt: 0 },
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        product: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (expiringBatches.length === 0) return;

    const criticalBatches = expiringBatches.filter(b => {
      const days = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    });

    const warningBatches = expiringBatches.filter(b => {
      const days = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days > 7 && days <= 30;
    });

    if (criticalBatches.length > 0) {
      await this.sendToAllAdmins({
        type: 'EXPIRY',
        title: `⚠️ ${criticalBatches.length} product(s) expiring in 7 days`,
        message: `Products: ${criticalBatches.map(b => `${b.product.name} (${b.batchNumber})`).join(', ')}`,
        severity: 'critical',
        action: '/inventory',
        data: { batches: criticalBatches.map(b => b.id) },
      });
    }

    if (warningBatches.length > 0) {
      await this.sendToAllAdmins({
        type: 'EXPIRY',
        title: `⚠️ ${warningBatches.length} product(s) expiring in 30 days`,
        message: `Products: ${warningBatches.slice(0, 5).map(b => `${b.product.name} (${b.batchNumber})`).join(', ')}${warningBatches.length > 5 ? ` and ${warningBatches.length - 5} more` : ''}`,
        severity: 'warning',
        action: '/inventory',
        data: { batches: warningBatches.map(b => b.id) },
      });
    }
  }

  async checkStockLevels() {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        batches: {
          where: {
            isActive: true,
            quantity: { gt: 0 },
          },
          select: { quantity: true },
        },
      },
    });

    const lowStockProducts = products
      .map(p => ({
        ...p,
        totalStock: p.batches.reduce((sum, b) => sum + b.quantity, 0),
      }))
      .filter(p => p.totalStock === 0 || p.totalStock <= (p.reorderLevel || 0));

    if (lowStockProducts.length === 0) return;

    const outOfStock = lowStockProducts.filter(p => p.totalStock === 0);
    if (outOfStock.length > 0) {
      await this.sendToAllAdmins({
        type: 'STOCK_OUT',
        title: `🔴 ${outOfStock.length} product(s) out of stock!`,
        message: `Products: ${outOfStock.map(p => p.name).join(', ')}`,
        severity: 'critical',
        action: '/inventory',
        data: { products: outOfStock.map(p => p.id) },
      });
    }

    const lowStock = lowStockProducts.filter(p => p.totalStock > 0 && p.totalStock <= (p.reorderLevel || 0));
    if (lowStock.length > 0) {
      await this.sendToAllAdmins({
        type: 'LOW_STOCK',
        title: `⚠️ ${lowStock.length} product(s) below reorder level`,
        message: `Products: ${lowStock.slice(0, 5).map(p => `${p.name} (${p.totalStock} left)`).join(', ')}${lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : ''}`,
        severity: 'warning',
        action: '/inventory',
        data: { products: lowStock.map(p => p.id) },
      });
    }
  }

  async checkLargeSale(saleId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        user: true,
        saleItems: {
          include: {
            batch: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!sale || sale.totalAmount < 100000) return;

    await this.sendToAllAdmins({
      type: 'SALE',
      title: `💰 Large Sale: RWF ${sale.totalAmount.toLocaleString()}`,
      message: `Sale #${sale.invoiceNumber} by ${sale.user.firstName} ${sale.user.lastName} (${sale.saleItems.length} items)`,
      severity: 'info',
      action: `/sales/${sale.id}`,
      data: { saleId: sale.id },
    });
  }
}

export default new NotificationService();