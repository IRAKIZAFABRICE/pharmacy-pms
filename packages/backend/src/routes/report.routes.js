"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/report.routes.ts
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new report_controller_1.ReportController();
// Sales Reports
router.get('/sales/daily', auth_middleware_1.authenticate, controller.getDailySales.bind(controller));
router.get('/sales/weekly', auth_middleware_1.authenticate, controller.getWeeklySales.bind(controller));
router.get('/sales/monthly', auth_middleware_1.authenticate, controller.getMonthlySales.bind(controller));
// Profit/Loss
router.get('/profit-loss', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'OWNER', 'ACCOUNTANT'), controller.getProfitLoss.bind(controller));
// Inventory Reports
router.get('/expiring', auth_middleware_1.authenticate, controller.getExpiringProducts.bind(controller));
router.get('/out-of-stock', auth_middleware_1.authenticate, controller.getOutOfStockProducts.bind(controller));
// Notifications
router.get('/notifications', auth_middleware_1.authenticate, controller.getNotifications.bind(controller));
exports.default = router;
//# sourceMappingURL=report.routes.js.map