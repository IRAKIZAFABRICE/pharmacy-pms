// packages/backend/src/routes/supplier.routes.ts
import { Router } from 'express';
import { SupplierController } from '../controllers/supplier.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new SupplierController();

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', authorize('ADMIN', 'OWNER', 'MANAGER'), controller.create.bind(controller));
router.put('/:id', authorize('ADMIN', 'OWNER', 'MANAGER'), controller.update.bind(controller));
router.delete('/:id', authorize('ADMIN'), controller.delete.bind(controller));

export default router;