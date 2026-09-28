"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/insurance.routes.ts
const express_1 = require("express");
const insurance_controller_1 = require("../controllers/insurance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new insurance_controller_1.InsuranceController();
// ==================== INSURANCE COMPANIES ====================
router.get('/companies', auth_middleware_1.authenticate, controller.getCompanies.bind(controller));
router.get('/companies/:id', auth_middleware_1.authenticate, controller.getCompanyById.bind(controller));
router.post('/companies', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'OWNER', 'MANAGER'), controller.createCompany.bind(controller));
router.put('/companies/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'OWNER', 'MANAGER'), controller.updateCompany.bind(controller));
router.delete('/companies/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), controller.deleteCompany.bind(controller));
// ==================== COVERAGE RULES ====================
router.post('/coverage-rules', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.createCoverageRule.bind(controller));
router.put('/coverage-rules/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.updateCoverageRule.bind(controller));
router.delete('/coverage-rules/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), controller.deleteCoverageRule.bind(controller));
// ==================== INSURANCE CLAIMS ====================
router.get('/claims', auth_middleware_1.authenticate, controller.getClaims.bind(controller));
router.get('/claims/summary', auth_middleware_1.authenticate, controller.getClaimsSummary.bind(controller));
router.get('/claims/:id', auth_middleware_1.authenticate, controller.getClaimById.bind(controller));
router.get('/claims/number/:claimNumber', auth_middleware_1.authenticate, controller.getClaimByNumber.bind(controller));
router.post('/claims', auth_middleware_1.authenticate, controller.createClaim.bind(controller));
router.patch('/claims/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.approveClaim.bind(controller));
router.patch('/claims/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.rejectClaim.bind(controller));
router.patch('/claims/:id/pay', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.markClaimAsPaid.bind(controller));
exports.default = router;
//# sourceMappingURL=insurance.routes.js.map