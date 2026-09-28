// packages/backend/src/controllers/supplierProduct.controller.ts

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SupplierProductController {
  // Get all products for a supplier with last prices
  static async getSupplierCatalog(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch supplier catalog' });
    }
  }

  // Get last invoice details for a supplier
  static async getLastInvoice(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch last invoice' });
    }
  }

  // Get product details with supplier-specific pricing
  static async getProductWithSupplierPrice(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch product price' });
    }
  }

  // Update supplier product prices
  static async updateSupplierProduct(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({ error: 'Failed to update supplier product' });
    }
  }
}