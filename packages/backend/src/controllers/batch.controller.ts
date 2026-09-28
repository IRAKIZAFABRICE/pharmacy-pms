// packages/backend/src/controllers/batch.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class BatchController {
  // Get all batches with filters
  async getAll(req: Request, res: Response) {
    try {
      const { productId, supplierId, isActive = 'true', page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (isActive === 'true') {
        where.isActive = true;
      } else if (isActive === 'false') {
        where.isActive = false;
      }

      if (productId) {
        where.productId = productId as string;
      }

      if (supplierId) {
        where.supplierId = supplierId as string;
      }

      const [batches, total] = await Promise.all([
        prisma.batch.findMany({
          where,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                unitOfMeasure: true,
                category: true,
                subCategory: true,
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: { expiryDate: 'asc' },
          skip,
          take,
        }),
        prisma.batch.count({ where }),
      ]);

      return res.json({
        data: batches,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      return res.status(500).json({ error: 'Failed to fetch batches' });
    }
  }

  // Get single batch by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const batch = await prisma.batch.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              unitOfMeasure: true,
              category: true,
              subCategory: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          saleItems: {
            include: {
              sale: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  saleDate: true,
                },
              },
            },
          },
          stockAdjustments: true,
        },
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      return res.json(batch);
    } catch (error) {
      console.error('Error fetching batch:', error);
      return res.status(500).json({ error: 'Failed to fetch batch' });
    }
  }

  // Receive new inventory (create batch)
  async receiveInventory(req: AuthRequest, res: Response) {
    try {
      const {
        productId,
        batchNumber,
        expiryDate,
        quantity,
        containerSize,
        quantityPerContainer,
        containerCost,
        costPrice,
        sellingPrice,
        supplierId,
        isConfirmed = false,
        invoiceNumber,
        invoiceAmount,
      } = req.body;

      if (!productId || !batchNumber || !expiryDate || !quantity || !costPrice || !sellingPrice || !containerSize) {
        return res.status(400).json({
          error: 'Product ID, batch number, expiry date, quantity, cost price, selling price, and container size are required',
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          error: 'Quantity must be greater than 0',
        });
      }

      if (containerSize <= 0) {
        return res.status(400).json({
          error: 'Container size must be greater than 0',
        });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let finalSellingPrice = sellingPrice;
      if (!finalSellingPrice || finalSellingPrice === 0) {
        const markup = 1.5;
        finalSellingPrice = Math.round(costPrice * markup);
      }

      const existingBatch = await prisma.batch.findUnique({
        where: {
          batchNumber_productId: {
            batchNumber,
            productId,
          },
        },
      });

      if (existingBatch) {
        // --- REQ 4: Incremental stock update for existing batch ---
        // Instead of rejecting, merge: add quantity to existing batch,
        // and update expiryDate if a new one is provided.
        const updatedBatch = await prisma.batch.update({
          where: { id: existingBatch.id },
          data: {
            quantity: { increment: Number(quantity) },
            initialQuantity: { increment: Number(quantity) },
            expiryDate: expiryDate ? new Date(expiryDate) : existingBatch.expiryDate,
            costPrice: Number(costPrice) || existingBatch.costPrice,
            sellingPrice: Number(finalSellingPrice) || existingBatch.sellingPrice,
            containerSize: Number(containerSize) || existingBatch.containerSize,
            quantityPerContainer: quantityPerContainer !== undefined ? Number(quantityPerContainer) : existingBatch.quantityPerContainer,
            containerCost: containerCost !== undefined ? Number(containerCost) : existingBatch.containerCost,
            invoiceNumber: invoiceNumber || existingBatch.invoiceNumber,
            invoiceAmount: invoiceAmount || existingBatch.invoiceAmount,
          },
          include: {
            product: { select: { id: true, name: true, code: true, category: true, subCategory: true, unitOfMeasure: true } },
            supplier: { select: { id: true, name: true, code: true } },
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action: 'INVENTORY_INCREMENTED',
            entity: 'BATCH',
            entityId: updatedBatch.id,
            details: {
              productId,
              productName: product.name,
              batchNumber,
              addedQuantity: Number(quantity),
              previousQuantity: existingBatch.quantity,
              newQuantity: updatedBatch.quantity,
              invoiceNumber,
              invoiceAmount,
            },
          },
        });

        return res.status(200).json({
          message: 'Existing batch updated — quantity incremented',
          data: updatedBatch,
          existing: true,
        });
      }

      const batch = await prisma.batch.create({
        data: {
          batchNumber,
          productId,
          supplierId: supplierId || null,
          quantity: Number(quantity),
          initialQuantity: Number(quantity),
          costPrice: Number(costPrice),
          sellingPrice: Number(finalSellingPrice),
          containerSize: Number(containerSize),
          quantityPerContainer: quantityPerContainer !== undefined ? Number(quantityPerContainer) : null,
          containerCost: containerCost !== undefined ? Number(containerCost) : null,
          expiryDate: new Date(expiryDate),
          dateReceived: new Date(),
          isConfirmed: isConfirmed || false,
          invoiceNumber: invoiceNumber || '',
          invoiceAmount: invoiceAmount || 0,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true,
              subCategory: true,
              unitOfMeasure: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INVENTORY_RECEIVED',
          entity: 'BATCH',
          entityId: batch.id,
          details: {
            productId,
            productName: product.name,
            batchNumber,
            quantity,
            containerSize,
            costPrice,
            sellingPrice: finalSellingPrice,
            expiryDate,
            markup: (finalSellingPrice / costPrice).toFixed(2),
            isConfirmed,
            invoiceNumber,
            invoiceAmount,
          },
        },
      });

      return res.status(201).json({
        message: 'Inventory received successfully',
        data: batch,
      });
    } catch (error) {
      console.error('Error receiving inventory:', error);
      return res.status(500).json({ error: 'Failed to receive inventory' });
    }
  }

  // Confirm batch (add to stock)
  async confirmBatch(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { batchNumber, expiryDate, quantity, containerSize, costPrice, sellingPrice, supplierId } = req.body;

      const batch = await prisma.batch.findUnique({
        where: { id },
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      if (batch.isConfirmed === true) {
        return res.status(400).json({ error: 'Batch is already confirmed' });
      }

      const updated = await prisma.batch.update({
        where: { id },
        data: {
          isConfirmed: true,
          batchNumber: batchNumber || batch.batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : batch.expiryDate,
          quantity: quantity || batch.quantity,
          containerSize: containerSize || batch.containerSize,
          costPrice: costPrice || batch.costPrice,
          sellingPrice: sellingPrice || batch.sellingPrice,
          supplierId: supplierId || batch.supplierId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'BATCH_CONFIRMED',
          entity: 'BATCH',
          entityId: updated.id,
          details: {
            batchNumber: updated.batchNumber,
            productName: updated.product.name,
            quantity: updated.quantity,
          },
        },
      });

      return res.json({
        message: 'Batch confirmed successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error confirming batch:', error);
      return res.status(500).json({ error: 'Failed to confirm batch' });
    }
  }

  // Adjust stock (add or remove)
  async adjustStock(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, reason, notes } = req.body;

      if (quantity === undefined || quantity === null) {
        return res.status(400).json({ error: 'Quantity is required' });
      }

      if (quantity === 0) {
        return res.status(400).json({ error: 'Quantity must be non-zero' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
      }

      const batch = await prisma.batch.findUnique({
        where: { id },
        include: { product: true },
      });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      const newQuantity = batch.quantity + Number(quantity);

      if (newQuantity < 0) {
        return res.status(400).json({
          error: `Insufficient stock. Available: ${batch.quantity}`,
        });
      }

      const updatedBatch = await prisma.batch.update({
        where: { id },
        data: { quantity: newQuantity },
      });

      const adjustment = await prisma.stockAdjustment.create({
        data: {
          productId: batch.productId,
          batchId: id,
          userId: req.user?.id!,
          quantity: Number(quantity),
          previousQuantity: batch.quantity,
          reason,
          notes: notes || '',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'STOCK_ADJUSTED',
          entity: 'BATCH',
          entityId: id,
          details: {
            productId: batch.productId,
            productName: batch.product.name,
            batchNumber: batch.batchNumber,
            adjustment: quantity,
            reason,
            previousQuantity: batch.quantity,
            newQuantity,
          },
        },
      });

      return res.json({
        message: 'Stock adjusted successfully',
        data: {
          batch: updatedBatch,
          adjustment,
        },
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      return res.status(500).json({ error: 'Failed to adjust stock' });
    }
  }

  // Get expiring batches
  async getExpiringBatches(req: Request, res: Response) {
    try {
      const { days = 30 } = req.query;

      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + Number(days));

      const batches = await prisma.batch.findMany({
        where: {
          isActive: true,
          quantity: { gt: 0 },
          expiryDate: {
            lte: expiryThreshold,
            gte: new Date(),
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              unitOfMeasure: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { expiryDate: 'asc' },
      });

      return res.json({
        data: batches,
        count: batches.length,
        days: Number(days),
      });
    } catch (error) {
      console.error('Error fetching expiring batches:', error);
      return res.status(500).json({ error: 'Failed to fetch expiring batches' });
    }
  }

  // Get low stock products
  async getLowStockProducts(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
          batches: {
            where: {
              isActive: true,
              quantity: { gt: 0 },
            },
            select: { quantity: true },
          },
        },
      });

      const lowStockProducts = products
        .map(product => {
          const totalStock = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
          return {
            ...product,
            totalStock,
            reorderLevel: product.reorderLevel || 0,
            isLowStock: totalStock <= (product.reorderLevel || 0),
          };
        })
        .filter(p => p.isLowStock)
        .sort((a, b) => a.totalStock - b.totalStock);

      return res.json({
        data: lowStockProducts,
        count: lowStockProducts.length,
      });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return res.status(500).json({ error: 'Failed to fetch low stock products' });
    }
  }
}
