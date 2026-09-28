"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rssb_controller_1 = require("../controllers/rssb.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new rssb_controller_1.RSSBController();
// RSSB VCDC Integration Routes
router.post('/eligibility', auth_middleware_1.authenticate, controller.verifyEligibility.bind(controller));
router.post('/mutuelle-copay', auth_middleware_1.authenticate, controller.verifyMutuelleCoPay.bind(controller));
router.post('/claims', auth_middleware_1.authenticate, controller.submitClaim.bind(controller));
router.get('/claims/status/:rssbClaimNumber', auth_middleware_1.authenticate, controller.checkClaimStatus.bind(controller));
router.get('/claims/summary', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'ACCOUNTANT'), controller.getRSSBClaimsSummary.bind(controller));
router.get('/config', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), controller.getConfig.bind(controller));
exports.default = router;
//# sourceMappingURL=rssb.routes.js.map