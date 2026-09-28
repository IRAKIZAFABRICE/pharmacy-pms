import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
export declare class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare function errorHandler(err: Error | AppError | Prisma.PrismaClientKnownRequestError, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>>;
//# sourceMappingURL=error.middleware.d.ts.map