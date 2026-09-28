import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class AuthController {
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    changePassword(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    refreshToken(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAllUsers(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    createUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    updateUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=auth.controller.d.ts.map