// packages/backend/src/routes/report.routes.ts
import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new ReportController();

// Sales Reports
router.get('/sales/daily', authenticate, controller.getDailySales.bind(controller));
router.get('/sales/weekly', authenticate, controller.getWeeklySales.bind(controller));
router.get('/sales/monthly', authenticate, controller.getMonthlySales.bind(controller));

// Profit/Loss
router.get('/profit-loss', authenticate, authorize('ADMIN', 'OWNER', 'ACCOUNTANT'), controller.getProfitLoss.bind(controller));

// Inventory Reports
router.get('/expiring', authenticate, controller.getExpiringProducts.bind(controller));
router.get('/out-of-stock', authenticate, controller.getOutOfStockProducts.bind(controller));

// Notifications
router.get('/notifications', authenticate, controller.getNotifications.bind(controller));

export default router;