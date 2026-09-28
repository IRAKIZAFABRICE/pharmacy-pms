import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class NotificationController {
    getNotifications(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    markAsRead(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    markAllAsRead(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteNotification(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getUnreadCount(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    triggerExpiryCheck(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=notification.controller.d.ts.map