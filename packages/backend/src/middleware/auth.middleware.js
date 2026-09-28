"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function authenticate(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Invalid token format' });
            return;
        }
        // Verify token
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Check if user exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({ error: 'Account is deactivated' });
            return;
        }
        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}
function authorize(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized - No user found' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.middleware.js.map