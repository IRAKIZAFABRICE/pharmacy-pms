"use strict";
// packages/backend/src/routes/purchase.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const purchase_controller_1 = require("../controllers/purchase.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new purchase_controller_1.PurchaseController();
// ============= QUICK PURCHASE INVOICE ROUTES (NEW) =============
// MUST be defined BEFORE the /:id param routes to avoid route conflicts
// Get all purchase invoices (for listing)
router.get('/invoices', auth_middleware_1.authenticate, controller.getAllPurchaseInvoices.bind(controller));
// Get single purchase invoice by ID
router.get('/invoice/:id', auth_middleware_1.authenticate, controller.getPurchaseInvoiceById.bind(controller));
// Cancel purchase invoice
router.patch('/invoice/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'OWNER'), controller.cancelPurchaseInvoice.bind(controller));
// Create quick purchase invoice
router.post('/quick-invoice', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.createQuickPurchaseInvoice.bind(controller));
// Get last invoice for a supplier (Load Last Invoice feature)
router.get('/supplier/:supplierId/last-invoice', auth_middleware_1.authenticate, controller.getLastInvoice.bind(controller));
// Duplicate last invoice for a supplier
router.get('/duplicate/:supplierId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.duplicateLastInvoice.bind(controller));
// Get supplier product catalog with last prices
router.get('/supplier/:supplierId/catalog', auth_middleware_1.authenticate, controller.getSupplierCatalog.bind(controller));
// Get product with supplier-specific pricing
router.get('/supplier/:supplierId/product/:productId', auth_middleware_1.authenticate, controller.getProductWithSupplierPrice.bind(controller));
// Compare prices (price change detection)
router.get('/compare/:supplierId/:productId/:newCostPrice', auth_middleware_1.authenticate, controller.comparePrices.bind(controller));
// Update supplier product pricing
router.put('/supplier-product/:supplierId/:productId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.updateSupplierProduct.bind(controller));
// ============= LEGACY PURCHASE ORDER ROUTES =============
router.get('/', auth_middleware_1.authenticate, controller.getAllPurchaseOrders.bind(controller));
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.createPurchaseOrder.bind(controller));
router.get('/summary', auth_middleware_1.authenticate, controller.getPurchaseSummary.bind(controller));
router.get('/:id', auth_middleware_1.authenticate, controller.getPurchaseOrderById.bind(controller));
router.patch('/:id/receive', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.receivePurchaseOrder.bind(controller));
router.patch('/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.cancelPurchaseOrder.bind(controller));
exports.default = router;
//# sourceMappingURL=purchase.routes.js.map