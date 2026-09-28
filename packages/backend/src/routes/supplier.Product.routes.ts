// packages/backend/src/routes/supplierProduct.routes.ts

import { Router } from 'express';
import { SupplierProductController } from '../controllers/supplier.Product.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/supplier/:supplierId/catalog', authenticate, SupplierProductController.getSupplierCatalog);
router.get('/supplier/:supplierId/last-invoice', authenticate, SupplierProductController.getLastInvoice);
router.get('/supplier/:supplierId/product/:productId', authenticate, SupplierProductController.getProductWithSupplierPrice);
router.put('/supplier/:supplierId/product/:productId', authenticate, SupplierProductController.updateSupplierProduct);

export default router;