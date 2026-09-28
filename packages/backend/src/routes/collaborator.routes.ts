// packages/backend/src/routes/collaborator.routes.ts
import { Router } from 'express';
import { CollaboratorController } from '../controllers/collaborator.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new CollaboratorController();

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', authorize('ADMIN', 'OWNER'), controller.create.bind(controller));
router.put('/:id', authorize('ADMIN', 'OWNER'), controller.update.bind(controller));
router.delete('/:id', authorize('ADMIN'), controller.delete.bind(controller));

export default router;