// packages/backend/src/routes/rra.routes.ts
import { Router } from 'express';
import { RRAController } from '../controllers/rra.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new RRAController();

// RRA integration routes
router.post('/invoice', authenticate, controller.sendInvoice.bind(controller));
router.get('/config', authenticate, authorize('ADMIN', 'MANAGER'), controller.getConfig.bind(controller));
router.get('/status/:receiptNumber', authenticate, controller.checkInvoiceStatus.bind(controller));
router.post('/cancel', authenticate, authorize('ADMIN', 'MANAGER'), controller.cancelInvoice.bind(controller));
router.get('/pending', authenticate, authorize('ADMIN', 'MANAGER'), controller.getPendingInvoices.bind(controller));
router.post('/retry', authenticate, authorize('ADMIN', 'MANAGER'), controller.retryFailedInvoices.bind(controller));

export default router;