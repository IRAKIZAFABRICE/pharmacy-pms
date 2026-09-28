"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/rra.routes.ts
const express_1 = require("express");
const rra_controller_1 = require("../controllers/rra.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new rra_controller_1.RRAController();
// RRA integration routes
router.post('/invoice', auth_middleware_1.authenticate, controller.sendInvoice.bind(controller));
router.get('/config', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.getConfig.bind(controller));
router.get('/status/:receiptNumber', auth_middleware_1.authenticate, controller.checkInvoiceStatus.bind(controller));
router.post('/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.cancelInvoice.bind(controller));
router.get('/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.getPendingInvoices.bind(controller));
router.post('/retry', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.retryFailedInvoices.bind(controller));
exports.default = router;
//# sourceMappingURL=rra.routes.js.map