// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', authRateLimiter, controller.login.bind(controller));
router.post('/logout', authenticate, controller.logout.bind(controller));
router.get('/me', authenticate, controller.getCurrentUser.bind(controller));
router.post('/change-password', authenticate, controller.changePassword.bind(controller));
router.post('/refresh-token', controller.refreshToken.bind(controller));

export default router;