"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err);
    // Handle custom AppError
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
    // Handle Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
//# sourceMappingURL=error.middleware.js.map