"use strict";
// packages/backend/src/controllers/supplierProduct.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierProductController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SupplierProductController {
    // Get all products for a supplier with last prices
    static async getSupplierCatalog(req, res) {
        try {
            const { supplierId } = req.params;
            const catalog = await prisma.supplierProduct.findMany({
                where: { supplierId },
                include: {
                    product: true
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });
            res.json(catalog);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch supplier catalog' });
        }
    }
    // Get last invoice details for a supplier
    static async getLastInvoice(req, res) {
        try {
            const { supplierId } = req.params;
            const lastInvoice = await prisma.purchaseInvoice.findFirst({
                where: { supplierId },
                orderBy: { date: 'desc' },
                include: {
                    items: {
                        include: {
                            product: true
                        }
                    }
                }
            });
            if (!lastInvoice) {
                return res.json({ items: [] });
            }
            res.json(lastInvoice);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch last invoice' });
        }
    }
    // Get product details with supplier-specific pricing
    static async getProductWithSupplierPrice(req, res) {
        try {
            const { supplierId, productId } = req.params;
            const supplierProduct = await prisma.supplierProduct.findUnique({
                where: {
                    supplierId_productId: {
                        supplierId,
                        productId
                    }
                },
                include: {
                    product: true
                }
            });
            res.json(supplierProduct || { product: null });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch product price' });
        }
    }
    // Update supplier product prices
    static async updateSupplierProduct(req, res) {
        try {
            const { supplierId, productId } = req.params;
            const { costPrice, sellingPrice } = req.body;
            const updated = await prisma.supplierProduct.upsert({
                where: {
                    supplierId_productId: {
                        supplierId,
                        productId
                    }
                },
                update: {
                    lastCostPrice: costPrice,
                    lastSellingPrice: sellingPrice,
                    lastPurchaseDate: new Date()
                },
                create: {
                    supplierId,
                    productId,
                    lastCostPrice: costPrice,
                    lastSellingPrice: sellingPrice,
                    lastPurchaseDate: new Date()
                }
            });
            res.json(updated);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update supplier product' });
        }
    }
}
exports.SupplierProductController = SupplierProductController;
//# sourceMappingURL=supplier.Product.controller.js.map