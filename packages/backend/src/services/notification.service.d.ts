interface NotificationData {
    userId: string;
    type: string;
    title: string;
    message: string;
    severity?: 'info' | 'warning' | 'critical';
    action?: string;
    data?: any;
}
export declare class NotificationService {
    createNotification(data: NotificationData): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        message: string;
        userId: string;
        action: string | null;
        type: string;
        title: string;
        severity: string;
        read: boolean;
        readAt: Date | null;
    } | null>;
    sendToAllAdmins(data: Omit<NotificationData, 'userId'>): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        message: string;
        userId: string;
        action: string | null;
        type: string;
        title: string;
        severity: string;
        read: boolean;
        readAt: Date | null;
    }[]>;
    sendToUser(userId: string, data: Omit<NotificationData, 'userId'>): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        message: string;
        userId: string;
        action: string | null;
        type: string;
        title: string;
        severity: string;
        read: boolean;
        readAt: Date | null;
    } | null>;
    getUserNotifications(userId: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        message: string;
        userId: string;
        action: string | null;
        type: string;
        title: string;
        severity: string;
        read: boolean;
        readAt: Date | null;
    }[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(notificationId: string): Promise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        message: string;
        userId: string;
        action: string | null;
        type: string;
        title: string;
        severity: string;
        read: boolean;
        readAt: Date | null;
    }>;
    markAllAsRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    deleteNotification(notificationId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    checkExpiringProducts(): Promise<void>;
    checkStockLevels(): Promise<void>;
    checkLargeSale(saleId: string): Promise<void>;
}
declare const _default: NotificationService;
export default _default;
//# sourceMappingURL=notification.service.d.ts.map