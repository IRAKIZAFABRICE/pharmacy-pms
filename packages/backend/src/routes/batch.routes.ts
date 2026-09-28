// packages/backend/src/routes/batch.routes.ts
import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new BatchController();

router.get('/', authenticate, controller.getAll.bind(controller));
router.get('/expiring', authenticate, controller.getExpiringBatches.bind(controller));
router.get('/low-stock', authenticate, controller.getLowStockProducts.bind(controller));
router.get('/:id', authenticate, controller.getById.bind(controller));
router.post('/receive', authenticate, authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.receiveInventory.bind(controller));
router.patch('/:id/adjust', authenticate, authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.adjustStock.bind(controller));
// ✅ ADD THIS LINE
router.patch('/:id/confirm', authenticate, authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.confirmBatch.bind(controller));

export default router;