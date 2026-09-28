import { Router } from 'express';
import { RRAFiscalController } from '../controllers/rra.fiscal.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new RRAFiscalController();

// RRA Fiscal (VSDC/OSDC) Integration Routes
router.post('/invoice', authenticate, controller.sendFiscalInvoice.bind(controller));
router.get('/verify/:fiscalReceiptNumber', authenticate, controller.verifyFiscalInvoice.bind(controller));
router.post('/cancel', authenticate, authorize('ADMIN', 'MANAGER'), controller.cancelFiscalInvoice.bind(controller));
router.get('/config', authenticate, authorize('ADMIN'), controller.getConfig.bind(controller));

export default router;

