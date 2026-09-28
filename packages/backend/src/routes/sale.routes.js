"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/sale.routes.ts
const express_1 = require("express");
const sale_controller_1 = require("../controllers/sale.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new sale_controller_1.SaleController();
// Protected routes (authenticated)
router.post('/', auth_middleware_1.authenticate, controller.createSale.bind(controller));
router.get('/', auth_middleware_1.authenticate, controller.getAllSales.bind(controller));
router.get('/summary', auth_middleware_1.authenticate, controller.getSalesSummary.bind(controller));
router.get('/invoice/:invoiceNumber', auth_middleware_1.authenticate, controller.getSaleByInvoiceNumber.bind(controller));
router.get('/:id', auth_middleware_1.authenticate, controller.getSaleById.bind(controller));
router.patch('/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.cancelSale.bind(controller));
exports.default = router;
//# sourceMappingURL=sale.routes.js.map