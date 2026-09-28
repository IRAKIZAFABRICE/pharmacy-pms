import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class ProductController {
    getAll(req: Request, res: Response): Promise<void>;
    getById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
    reactivate(req: AuthRequest, res: Response): Promise<void>;
    getCategories(req: Request, res: Response): Promise<void>;
    searchByComposition(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=product.controller.d.ts.map