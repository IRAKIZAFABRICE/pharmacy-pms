import { Router } from 'express';
import { RSSBController } from '../controllers/rssb.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new RSSBController();

// RSSB VCDC Integration Routes
router.post('/eligibility', authenticate, controller.verifyEligibility.bind(controller));
router.post('/mutuelle-copay', authenticate, controller.verifyMutuelleCoPay.bind(controller));
router.post('/claims', authenticate, controller.submitClaim.bind(controller));
router.get('/claims/status/:rssbClaimNumber', authenticate, controller.checkClaimStatus.bind(controller));
router.get('/claims/summary', authenticate, authorize('ADMIN', 'MANAGER', 'ACCOUNTANT'), controller.getRSSBClaimsSummary.bind(controller));
router.get('/config', authenticate, authorize('ADMIN'), controller.getConfig.bind(controller));

export default router;

