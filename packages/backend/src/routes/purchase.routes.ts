// packages/backend/src/routes/purchase.routes.ts

import { Router } from 'express';
import { PurchaseController } from '../controllers/purchase.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new PurchaseController();

// ============= QUICK PURCHASE INVOICE ROUTES (NEW) =============
// MUST be defined BEFORE the /:id param routes to avoid route conflicts

// Get all purchase invoices (for listing)
router.get(
  '/invoices', 
  authenticate, 
  controller.getAllPurchaseInvoices.bind(controller)
);

// Get single purchase invoice by ID
router.get(
  '/invoice/:id', 
  authenticate, 
  controller.getPurchaseInvoiceById.bind(controller)
);

// Cancel purchase invoice
router.patch(
  '/invoice/:id/cancel', 
  authenticate, 
  authorize('ADMIN', 'MANAGER', 'OWNER'), 
  controller.cancelPurchaseInvoice.bind(controller)
);

// Create quick purchase invoice
router.post(
  '/quick-invoice', 
  authenticate, 
  authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), 
  controller.createQuickPurchaseInvoice.bind(controller)
);

// Get last invoice for a supplier (Load Last Invoice feature)
router.get(
  '/supplier/:supplierId/last-invoice', 
  authenticate, 
  controller.getLastInvoice.bind(controller)
);

// Duplicate last invoice for a supplier
router.get(
  '/duplicate/:supplierId', 
  authenticate, 
  authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), 
  controller.duplicateLastInvoice.bind(controller)
);

// Get supplier product catalog with last prices
router.get(
  '/supplier/:supplierId/catalog', 
  authenticate, 
  controller.getSupplierCatalog.bind(controller)
);

// Get product with supplier-specific pricing
router.get(
  '/supplier/:supplierId/product/:productId', 
  authenticate, 
  controller.getProductWithSupplierPrice.bind(controller)
);

// Compare prices (price change detection)
router.get(
  '/compare/:supplierId/:productId/:newCostPrice', 
  authenticate, 
  controller.comparePrices.bind(controller)
);

// Update supplier product pricing
router.put(
  '/supplier-product/:supplierId/:productId', 
  authenticate, 
  authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), 
  controller.updateSupplierProduct.bind(controller)
);

// ============= LEGACY PURCHASE ORDER ROUTES =============
router.get('/', authenticate, controller.getAllPurchaseOrders.bind(controller));
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.createPurchaseOrder.bind(controller));
router.get('/summary', authenticate, controller.getPurchaseSummary.bind(controller));
router.get('/:id', authenticate, controller.getPurchaseOrderById.bind(controller));
router.patch('/:id/receive', authenticate, authorize('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.receivePurchaseOrder.bind(controller));
router.patch('/:id/cancel', authenticate, authorize('ADMIN', 'MANAGER'), controller.cancelPurchaseOrder.bind(controller));

export default router;
