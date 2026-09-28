"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/batch.routes.ts
const express_1 = require("express");
const batch_controller_1 = require("../controllers/batch.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new batch_controller_1.BatchController();
router.get('/', auth_middleware_1.authenticate, controller.getAll.bind(controller));
router.get('/expiring', auth_middleware_1.authenticate, controller.getExpiringBatches.bind(controller));
router.get('/low-stock', auth_middleware_1.authenticate, controller.getLowStockProducts.bind(controller));
router.get('/:id', auth_middleware_1.authenticate, controller.getById.bind(controller));
router.post('/receive', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.receiveInventory.bind(controller));
router.patch('/:id/adjust', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.adjustStock.bind(controller));
// ✅ ADD THIS LINE
router.patch('/:id/confirm', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER', 'STOREKEEPER'), controller.confirmBatch.bind(controller));
exports.default = router;
//# sourceMappingURL=batch.routes.js.map