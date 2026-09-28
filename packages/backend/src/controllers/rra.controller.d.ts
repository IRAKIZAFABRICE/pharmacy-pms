import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class RRAController {
    sendInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    checkInvoiceStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPendingInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    retryFailedInvoices(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=rra.controller.d.ts.map