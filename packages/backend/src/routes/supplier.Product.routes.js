"use strict";
// packages/backend/src/routes/supplierProduct.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supplier_Product_controller_1 = require("../controllers/supplier.Product.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/supplier/:supplierId/catalog', auth_middleware_1.authenticate, supplier_Product_controller_1.SupplierProductController.getSupplierCatalog);
router.get('/supplier/:supplierId/last-invoice', auth_middleware_1.authenticate, supplier_Product_controller_1.SupplierProductController.getLastInvoice);
router.get('/supplier/:supplierId/product/:productId', auth_middleware_1.authenticate, supplier_Product_controller_1.SupplierProductController.getProductWithSupplierPrice);
router.put('/supplier/:supplierId/product/:productId', auth_middleware_1.authenticate, supplier_Product_controller_1.SupplierProductController.updateSupplierProduct);
exports.default = router;
//# sourceMappingURL=supplier.Product.routes.js.map