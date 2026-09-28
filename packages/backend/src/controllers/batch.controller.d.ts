import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class BatchController {
    getAll(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    receiveInventory(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    confirmBatch(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    adjustStock(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getExpiringBatches(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getLowStockProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=batch.controller.d.ts.map