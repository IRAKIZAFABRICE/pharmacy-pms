"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuthController {
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    passwordHash: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    phone: true,
                    lastLogin: true,
                },
            });
            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            if (!user.isActive) {
                return res.status(401).json({ error: 'Account is deactivated. Please contact administrator.' });
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });
            // ✅ FIXED: Using a unique local variable name and applying strict types cast
            const generatedToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-fallback-secret', { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') } // 👈 Cast to any
            );
            const { passwordHash, ...userWithoutPassword } = user;
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'LOGIN',
                    entity: 'USER',
                    entityId: user.id,
                    details: { email: user.email, role: user.role },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });
            return res.json({
                message: 'Login successful',
                token: generatedToken,
                user: userWithoutPassword,
            });
        }
        catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ error: 'Login failed' });
        }
    }
    async logout(req, res) {
        try {
            return res.json({ message: 'Logout successful' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Logout failed' });
        }
    }
    async getCurrentUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                },
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.json(user);
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to fetch user data' });
        }
    }
    async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            const { currentPassword, newPassword } = req.body;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new password are required' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { passwordHash: true },
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash: hashedPassword },
            });
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'PASSWORD_CHANGE',
                    entity: 'USER',
                    entityId: userId,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });
            return res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to change password' });
        }
    }
    async refreshToken(req, res) {
        try {
            const { token: incomingToken } = req.body;
            if (!incomingToken) {
                return res.status(400).json({ error: 'Token is required' });
            }
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jsonwebtoken_1.default.verify(incomingToken, secret);
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, email: true, role: true, isActive: true },
            });
            if (!user || !user.isActive) {
                return res.status(401).json({ error: 'Invalid user or account deactivated' });
            }
            // ✅ FIXED: Named newToken correctly to match return, avoiding duplicate declaration conflicts
            const newToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', {
                expiresIn: (process.env.JWT_EXPIRES_IN || '24h'), // 👈 Cast to any
            });
            return res.json({ token: newToken });
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }
            return res.status(500).json({ error: 'Failed to refresh token' });
        }
    }
    // ✅ Get all users (Admin only)
    async getAllUsers(req, res) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
                return res.status(403).json({ error: 'Access denied' });
            }
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            return res.json({ data: users });
        }
        catch (error) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
    }
    // ✅ Create user (Admin only)
    async createUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
                return res.status(403).json({ error: 'Access denied' });
            }
            const { email, password, firstName, lastName, phone, role } = req.body;
            if (!email || !password || !firstName || !lastName || !role) {
                return res.status(400).json({ error: 'All fields are required' });
            }
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                return res.status(409).json({ error: 'User with this email already exists' });
            }
            const allowedRoles = ['ADMIN', 'OWNER', 'PHARMACIST', 'NURSE', 'ACCOUNTANT'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            const passwordHash = await bcryptjs_1.default.hash(password, 10);
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName,
                    phone: phone || '',
                    role: role,
                    isActive: true,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'USER_CREATED',
                    entity: 'USER',
                    entityId: user.id,
                    details: { email: user.email, role: user.role },
                },
            });
            return res.status(201).json({
                message: 'User created successfully',
                data: user,
            });
        }
        catch (error) {
            console.error('Create user error:', error);
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }
    // ✅ Update user (Admin only)
    async updateUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
                return res.status(403).json({ error: 'Access denied' });
            }
            const { id } = req.params;
            const { firstName, lastName, phone, role, isActive, password } = req.body;
            const user = await prisma.user.findUnique({
                where: { id },
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const updateData = {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                phone: phone || user.phone,
                role: role || user.role,
                isActive: isActive !== undefined ? isActive : user.isActive,
            };
            if (password) {
                updateData.passwordHash = await bcryptjs_1.default.hash(password, 10);
            }
            const updated = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'USER_UPDATED',
                    entity: 'USER',
                    entityId: updated.id,
                    details: { email: updated.email },
                },
            });
            return res.json({
                message: 'User updated successfully',
                data: updated,
            });
        }
        catch (error) {
            console.error('Update user error:', error);
            return res.status(500).json({ error: 'Failed to update user' });
        }
    }
    // ✅ Delete user (Admin only)
    async deleteUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
                return res.status(403).json({ error: 'Access denied' });
            }
            const { id } = req.params;
            if (id === req.user?.id) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }
            const user = await prisma.user.findUnique({
                where: { id },
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            await prisma.user.update({
                where: { id },
                data: { isActive: false },
            });
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'USER_DELETED',
                    entity: 'USER',
                    entityId: id,
                    details: { email: user.email },
                },
            });
            return res.json({
                message: 'User deactivated successfully',
            });
        }
        catch (error) {
            console.error('Delete user error:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map