// packages/backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('❌ Error:', err);
  
  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'Duplicate entry. A record with this unique field already exists.',
          field: err.meta?.target,
          timestamp: new Date().toISOString(),
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Record not found',
          timestamp: new Date().toISOString(),
        });
      default:
        return res.status(500).json({
          error: 'Database error occurred',
          code: err.code,
          timestamp: new Date().toISOString(),
        });
    }
  }
  
  // Default error
  return res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    timestamp: new Date().toISOString(),
  });
}