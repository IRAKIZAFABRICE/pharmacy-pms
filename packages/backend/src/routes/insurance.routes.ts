// packages/backend/src/routes/insurance.routes.ts
import { Router } from 'express';
import { InsuranceController } from '../controllers/insurance.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new InsuranceController();

// ==================== INSURANCE COMPANIES ====================
router.get('/companies', authenticate, controller.getCompanies.bind(controller));
router.get('/companies/:id', authenticate, controller.getCompanyById.bind(controller));
router.post('/companies', authenticate, authorize('ADMIN', 'OWNER', 'MANAGER'), controller.createCompany.bind(controller));
router.put('/companies/:id', authenticate, authorize('ADMIN', 'OWNER', 'MANAGER'), controller.updateCompany.bind(controller));
router.delete('/companies/:id', authenticate, authorize('ADMIN'), controller.deleteCompany.bind(controller));

// ==================== COVERAGE RULES ====================
router.post('/coverage-rules', authenticate, authorize('ADMIN', 'MANAGER'), controller.createCoverageRule.bind(controller));
router.put('/coverage-rules/:id', authenticate, authorize('ADMIN', 'MANAGER'), controller.updateCoverageRule.bind(controller));
router.delete('/coverage-rules/:id', authenticate, authorize('ADMIN'), controller.deleteCoverageRule.bind(controller));

// ==================== INSURANCE CLAIMS ====================
router.get('/claims', authenticate, controller.getClaims.bind(controller));
router.get('/claims/summary', authenticate, controller.getClaimsSummary.bind(controller));
router.get('/claims/:id', authenticate, controller.getClaimById.bind(controller));
router.get('/claims/number/:claimNumber', authenticate, controller.getClaimByNumber.bind(controller));
router.post('/claims', authenticate, controller.createClaim.bind(controller));
router.patch('/claims/:id/approve', authenticate, authorize('ADMIN', 'MANAGER'), controller.approveClaim.bind(controller));
router.patch('/claims/:id/reject', authenticate, authorize('ADMIN', 'MANAGER'), controller.rejectClaim.bind(controller));
router.patch('/claims/:id/pay', authenticate, authorize('ADMIN', 'MANAGER'), controller.markClaimAsPaid.bind(controller));

export default router;