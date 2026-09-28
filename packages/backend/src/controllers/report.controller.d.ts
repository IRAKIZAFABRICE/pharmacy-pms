import { Request, Response } from 'express';
export declare class ReportController {
    getDailySales(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getWeeklySales(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMonthlySales(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getProfitLoss(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getExpiringProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getOutOfStockProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    private getWeekNumber;
    private getStartOfWeek;
    private getExpiringProductsData;
    private getOutOfStockProductsData;
    private getLowStockProductsData;
}
//# sourceMappingURL=report.controller.d.ts.map