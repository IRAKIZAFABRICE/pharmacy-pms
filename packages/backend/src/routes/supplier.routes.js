"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/supplier.routes.ts
const express_1 = require("express");
const supplier_controller_1 = require("../controllers/supplier.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new supplier_controller_1.SupplierController();
router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', (0, auth_middleware_1.authorize)('ADMIN', 'OWNER', 'MANAGER'), controller.create.bind(controller));
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN', 'OWNER', 'MANAGER'), controller.update.bind(controller));
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), controller.delete.bind(controller));
exports.default = router;
//# sourceMappingURL=supplier.routes.js.map