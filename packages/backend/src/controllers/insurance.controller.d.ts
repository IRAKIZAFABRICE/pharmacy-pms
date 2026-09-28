import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class InsuranceController {
    getCompanies(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCompanyById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createCompany(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCompany(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteCompany(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    createCoverageRule(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCoverageRule(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteCoverageRule(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getClaims(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getClaimById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getClaimByNumber(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    createClaim(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    generateClaimNumber(): Promise<string>;
    approveClaim(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    rejectClaim(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    markClaimAsPaid(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getClaimsSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=insurance.controller.d.ts.map