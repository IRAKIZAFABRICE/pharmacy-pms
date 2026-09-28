import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class RRAFiscalController {
    /**
     * Send fiscal invoice to RRA via VSDC/OSDC
     */
    sendFiscalInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Verify fiscal invoice with RRA
     */
    verifyFiscalInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Cancel fiscal invoice
     */
    cancelFiscalInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get RRA Fiscal configuration
     */
    getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=rra.fiscal.controller.d.ts.map