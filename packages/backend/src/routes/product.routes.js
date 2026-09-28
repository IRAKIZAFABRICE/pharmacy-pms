"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/product.routes.ts
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new product_controller_1.ProductController();
router.get('/', controller.getAll.bind(controller));
router.get('/search/composition', controller.searchByComposition.bind(controller));
router.get('/categories', controller.getCategories.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.create.bind(controller));
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.update.bind(controller));
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), controller.delete.bind(controller));
router.patch('/:id/reactivate', (0, auth_middleware_1.authorize)('ADMIN', 'MANAGER'), controller.reactivate.bind(controller));
exports.default = router;
//# sourceMappingURL=product.routes.js.map