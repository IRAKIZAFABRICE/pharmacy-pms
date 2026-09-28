import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class RSSBController {
    /**
     * Verify patient eligibility with RSSB
     */
    verifyEligibility(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Verify Mutuelle de Santé co-pay
     */
    verifyMutuelleCoPay(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Submit insurance claim to RSSB
     */
    submitClaim(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Check claim status with RSSB
     */
    checkClaimStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get RSSB configuration
     */
    getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get RSSB claims summary
     */
    getRSSBClaimsSummary(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=rssb.controller.d.ts.map