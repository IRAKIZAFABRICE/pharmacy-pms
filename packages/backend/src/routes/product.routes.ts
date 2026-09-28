// packages/backend/src/routes/product.routes.ts
import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new ProductController();

router.get('/', controller.getAll.bind(controller));
router.get('/search/composition', controller.searchByComposition.bind(controller));
router.get('/categories', controller.getCategories.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', authorize('ADMIN', 'MANAGER'), controller.create.bind(controller));
router.put('/:id', authorize('ADMIN', 'MANAGER'), controller.update.bind(controller));
router.delete('/:id', authorize('ADMIN'), controller.delete.bind(controller));
router.patch('/:id/reactivate', authorize('ADMIN', 'MANAGER'), controller.reactivate.bind(controller));

export default router;
