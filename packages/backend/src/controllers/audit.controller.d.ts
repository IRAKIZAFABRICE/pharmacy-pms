import { Request, Response } from 'express';
export declare class AuditController {
    getLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getLogById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAuditSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=audit.controller.d.ts.map