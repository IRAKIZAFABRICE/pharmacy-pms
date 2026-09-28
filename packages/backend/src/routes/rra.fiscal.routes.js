"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rra_fiscal_controller_1 = require("../controllers/rra.fiscal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new rra_fiscal_controller_1.RRAFiscalController();
// RRA Fiscal (VSDC/OSDC) Integration Routes
router.post('/invoice', auth_middleware_1.authenticate, controller.sendFiscalInvoice.bind(controller));
router.get('/verify/:fiscalReceiptNumber', auth_middleware_1.authenticate, controller.verifyFiscalInvoice.bind(controller));
router.post('/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.cancelFiscalInvoice.bind(controller));
router.get('/config', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), controller.getConfig.bind(controller));
exports.default = router;
//# sourceMappingURL=rra.fiscal.routes.js.map