import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class SaleController {
    createSale(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    generateInvoiceNumber(): Promise<string>;
    getAllSales(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSaleById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getSaleByInvoiceNumber(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelSale(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getSalesSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=sale.controller.d.ts.map