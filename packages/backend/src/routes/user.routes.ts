// packages/backend/src/routes/user.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new AuthController();

// All user routes require authentication
router.get('/', authenticate, controller.getAllUsers.bind(controller));
router.post('/', authenticate, controller.createUser.bind(controller));
router.put('/:id', authenticate, controller.updateUser.bind(controller));
router.delete('/:id', authenticate, controller.deleteUser.bind(controller));

export default router;