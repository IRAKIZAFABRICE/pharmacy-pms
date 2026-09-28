// packages/backend/src/routes/sale.routes.ts
import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new SaleController();

// Protected routes (authenticated)
router.post('/', authenticate, controller.createSale.bind(controller));
router.get('/', authenticate, controller.getAllSales.bind(controller));
router.get('/summary', authenticate, controller.getSalesSummary.bind(controller));
router.get('/invoice/:invoiceNumber', authenticate, controller.getSaleByInvoiceNumber.bind(controller));
router.get('/:id', authenticate, controller.getSaleById.bind(controller));
router.patch('/:id/cancel', authenticate, authorize('ADMIN', 'MANAGER'), controller.cancelSale.bind(controller));

export default router;