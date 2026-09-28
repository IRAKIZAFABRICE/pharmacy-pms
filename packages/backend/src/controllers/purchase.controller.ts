// packages/backend/src/controllers/purchase.controller.ts

import { Request, Response } from 'express';
import { PrismaClient, PurchaseStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Interface representing the shape of an invoice item for type-safety
interface CreateInvoiceItemInput {
  productId: string;
  batchNo: string;
  quantity: number;
  expiryDate: Date;
  costPrice: number;
  sellingPrice: number | null;
  packSize: string;
  isNewProduct: boolean;
}

export class PurchaseController {
  // ============= QUICK PURCHASE INVOICE FEATURE =============

  /**
   * Create a quick purchase invoice with auto-fill from supplier
   * Users only need: Batch No, Quantity, Expiry Date
   * Everything else is auto-filled from supplier product catalog
   */
  async createQuickPurchaseInvoice(req: AuthRequest, res: Response) {
    try {
      const {
        supplierId,
        invoiceNo,
        date,
        items,
        notes
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!supplierId) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
      }

      // Validate supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      // Calculate totals
      let totalAmount = 0;
      // FIX: Explicitly type the array so TypeScript knows what it contains
      const invoiceItems: CreateInvoiceItemInput[] = [];

      for (const item of items) {
        // Validate required fields for quick purchase
        if (!item.productId) {
          return res.status(400).json({ error: 'Product ID is required for all items' });
        }
        if (!item.batchNo) {
          return res.status(400).json({ error: 'Batch number is required for all items' });
        }
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: 'Quantity must be greater than 0 for all items' });
        }
        if (!item.expiryDate) {
          return res.status(400).json({ error: 'Expiry date is required for all items' });
        }

        // Get product
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return res.status(404).json({ error: `Product not found: ${item.productId}` });
        }

        // Calculate item total
        const itemTotal = item.costPrice * item.quantity;
        totalAmount += itemTotal;

        invoiceItems.push({
          productId: item.productId,
          batchNo: item.batchNo,
          quantity: item.quantity,
          expiryDate: new Date(item.expiryDate),
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice || null,
          packSize: item.packSize || product.unitOfMeasure,
          isNewProduct: item.isNewProduct || false,
        });
      }

      // Start transaction to ensure all operations succeed or fail together
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create purchase invoice
        const invoice = await tx.purchaseInvoice.create({
          data: {
            invoiceNo: invoiceNo || await this.generateInvoiceNumber(),
            supplierId,
            userId,
            date: date ? new Date(date) : new Date(),
            totalAmount,
            status: PurchaseStatus.RECEIVED, // Using the enum properly
            notes: notes || null,
            items: {
              create: invoiceItems,
            },
          },
          include: {
            supplier: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // 2. Process each item - Update stock, create batches, update supplier catalog
        for (const item of invoiceItems) {
          // 2a. Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice || undefined,
            },
          });

          // 2b. Create batch
          await tx.batch.create({
            data: {
              batchNumber: item.batchNo,
              productId: item.productId,
              supplierId: supplierId,
              quantity: item.quantity,
              initialQuantity: item.quantity,
              costPrice: item.costPrice,
              sellingPrice: item.sellingPrice || item.costPrice * 1.5,
              expiryDate: item.expiryDate,
              dateReceived: new Date(),
              isConfirmed: true,
              invoiceNumber: invoice.invoiceNo,
              invoiceAmount: item.costPrice * item.quantity,
            },
          });

          // 2c. Update or create supplier product catalog entry
          await tx.supplierProduct.upsert({
            where: {
              supplierId_productId: {
                supplierId,
                productId: item.productId,
              },
            },
            update: {
              lastCostPrice: item.costPrice,
              lastSellingPrice: item.sellingPrice || undefined,
              lastPurchaseDate: new Date(),
              lastInvoiceNumber: invoice.invoiceNo,
            },
            create: {
              supplierId,
              productId: item.productId,
              lastCostPrice: item.costPrice,
              lastSellingPrice: item.sellingPrice || undefined,
              lastPurchaseDate: new Date(),
              lastInvoiceNumber: invoice.invoiceNo,
            },
          });
        }

        return invoice;
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PURCHASE_INVOICE_CREATED',
          entity: 'PURCHASE_INVOICE',
          entityId: result.id,
          details: {
            invoiceNo: result.invoiceNo,
            supplierId,
            totalAmount: result.totalAmount,
            items: result.items.length,
            type: 'QUICK_PURCHASE',
          },
        },
      });

      return res.status(201).json({
        message: 'Purchase invoice created successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error creating quick purchase invoice:', error);
      return res.status(500).json({ error: 'Failed to create purchase invoice' });
    }
  }

  /**
   * Get last invoice for a supplier with all items
   * Used for "Load Last Invoice" feature
   */
  async getLastInvoice(req: Request, res: Response) {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      const lastInvoice = await prisma.purchaseInvoice.findFirst({
        where: {
          supplierId,
          status: PurchaseStatus.RECEIVED,
        },
        orderBy: { date: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });

      if (!lastInvoice) {
        return res.json({
          hasInvoice: false,
          message: 'No previous invoice found for this supplier',
          items: [],
        });
      }

      return res.json({
        hasInvoice: true,
        data: lastInvoice,
        items: lastInvoice.items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          productCode: item.product.code,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          packSize: item.packSize || item.product.unitOfMeasure,
          lastBatchNo: item.batchNo,
          // These will be filled by the user
          batchNo: '',
          quantity: 0,
          expiryDate: null,
        })),
      });
    } catch (error) {
      console.error('Error fetching last invoice:', error);
      return res.status(500).json({ error: 'Failed to fetch last invoice' });
    }
  }

  /**
   * Duplicate last invoice for quick re-ordering
   */
  async duplicateLastInvoice(req: Request, res: Response) {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      const lastInvoice = await prisma.purchaseInvoice.findFirst({
        where: {
          supplierId,
          status: PurchaseStatus.RECEIVED,
        },
        orderBy: { date: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!lastInvoice) {
        return res.status(404).json({
          error: 'No previous invoice found to duplicate',
        });
      }

      // Generate new invoice number
      const newInvoiceNo = await this.generateInvoiceNumber();

      // Return items without batch/expiry for user to fill
      const duplicatedItems = lastInvoice.items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        productCode: item.product.code,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        packSize: item.packSize || item.product.unitOfMeasure,
        // Leave these empty for the user to fill
        batchNo: '',
        quantity: 0,
        expiryDate: null,
      }));

      return res.json({
        success: true,
        invoiceNo: newInvoiceNo,
        supplierId: lastInvoice.supplierId,
        date: new Date().toISOString().split('T')[0],
        items: duplicatedItems,
        totalItems: duplicatedItems.length,
        originalInvoiceNo: lastInvoice.invoiceNo,
        message: `Duplicated ${duplicatedItems.length} items from last invoice`,
      });
    } catch (error) {
      console.error('Error duplicating last invoice:', error);
      return res.status(500).json({ error: 'Failed to duplicate last invoice' });
    }
  }

  /**
   * Get supplier product catalog with last prices
   */
  async getSupplierCatalog(req: Request, res: Response) {
    try {
      const { supplierId } = req.params;

      if (!supplierId) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      const catalog = await prisma.supplierProduct.findMany({
        where: {
          supplierId,
          isActive: true,
        },
        include: {
          product: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return res.json({
        supplierId,
        total: catalog.length,
        data: catalog,
      });
    } catch (error) {
      console.error('Error fetching supplier catalog:', error);
      return res.status(500).json({ error: 'Failed to fetch supplier catalog' });
    }
  }

  /**
   * Get product with supplier-specific pricing
   */
  async getProductWithSupplierPrice(req: Request, res: Response) {
    try {
      const { supplierId, productId } = req.params;

      if (!supplierId || !productId) {
        return res.status(400).json({ error: 'Supplier ID and Product ID are required' });
      }

      const supplierProduct = await prisma.supplierProduct.findUnique({
        where: {
          supplierId_productId: {
            supplierId,
            productId,
          },
        },
        include: {
          product: true,
        },
      });

      if (!supplierProduct) {
        // Get product without supplier pricing
        const product = await prisma.product.findUnique({
          where: { id: productId },
        });

        return res.json({
          hasPrice: false,
          product,
          supplierProduct: null,
          message: 'No previous pricing found for this product from this supplier',
        });
      }

      return res.json({
        hasPrice: true,
        supplierProduct,
        product: supplierProduct.product,
      });
    } catch (error) {
      console.error('Error fetching product with supplier price:', error);
      return res.status(500).json({ error: 'Failed to fetch product price' });
    }
  }

  /**
   * Compare prices for price change detection
   */
  async comparePrices(req: Request, res: Response) {
    try {
      const { supplierId, productId, newCostPrice } = req.params;

      if (!supplierId || !productId || !newCostPrice) {
        return res.status(400).json({ error: 'Supplier ID, Product ID, and new cost price are required' });
      }

      const supplierProduct = await prisma.supplierProduct.findUnique({
        where: {
          supplierId_productId: {
            supplierId,
            productId,
          },
        },
        include: {
          product: true,
        },
      });

      const newPrice = parseFloat(newCostPrice);

      if (!supplierProduct || !supplierProduct.lastCostPrice) {
        return res.json({
          hasChanged: false,
          oldPrice: null,
          newPrice: newPrice,
          message: 'No previous price found',
        });
      }

      const oldPrice = supplierProduct.lastCostPrice;
      const hasChanged = oldPrice !== newPrice;
      const percentageChange = hasChanged ? ((newPrice - oldPrice) / oldPrice * 100) : 0;

      return res.json({
        hasChanged,
        oldPrice,
        newPrice,
        percentageChange,
        productName: supplierProduct.product.name,
        message: hasChanged
          ? `Price changed from ${oldPrice.toFixed(2)} to ${newPrice.toFixed(2)} (${percentageChange.toFixed(1)}% change)`
          : 'Price unchanged',
        severity: Math.abs(percentageChange) > 10 ? 'HIGH' : Math.abs(percentageChange) > 5 ? 'MEDIUM' : 'LOW',
      });
    } catch (error) {
      console.error('Error comparing prices:', error);
      return res.status(500).json({ error: 'Failed to compare prices' });
    }
  }

  /**
   * Update supplier product pricing
   */
  async updateSupplierProduct(req: Request, res: Response) {
    try {
      const { supplierId, productId } = req.params;
      const { costPrice, sellingPrice, notes } = req.body;

      if (!supplierId || !productId) {
        return res.status(400).json({ error: 'Supplier ID and Product ID are required' });
      }

      if (costPrice === undefined && sellingPrice === undefined) {
        return res.status(400).json({ error: 'At least one price field is required' });
      }

      // Get existing record if any
      const existing = await prisma.supplierProduct.findUnique({
        where: {
          supplierId_productId: {
            supplierId,
            productId,
          },
        },
      });

      const updated = await prisma.supplierProduct.upsert({
        where: {
          supplierId_productId: {
            supplierId,
            productId,
          },
        },
        update: {
          ...(costPrice !== undefined && { lastCostPrice: costPrice }),
          ...(sellingPrice !== undefined && { lastSellingPrice: sellingPrice }),
          lastPurchaseDate: new Date(),
        },
        create: {
          supplierId,
          productId,
          lastCostPrice: costPrice || 0,
          lastSellingPrice: sellingPrice || null,
          lastPurchaseDate: new Date(),
        },
        include: {
          product: true,
          supplier: true,
        },
      });

      // Log price change if cost price changed
      if (existing && costPrice !== undefined && existing.lastCostPrice !== costPrice) {
        await prisma.priceChangeHistory.create({
          data: {
            supplierId,
            productId,
            oldCostPrice: existing.lastCostPrice || 0,
            newCostPrice: costPrice,
            oldSellingPrice: existing.lastSellingPrice,
            newSellingPrice: sellingPrice,
            changedBy: (req as AuthRequest).user?.id || 'system',
            reason: notes || 'Manual price update',
          },
        });
      }

      return res.json({
        message: 'Supplier product pricing updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error updating supplier product:', error);
      return res.status(500).json({ error: 'Failed to update supplier product' });
    }
  }

  // ============= LEGACY PURCHASE ORDER METHODS =============

  // Generate invoice number (sequential)
  async generateInvoiceNumber(): Promise<string> {
    const lastInvoice = await prisma.purchaseInvoice.findFirst({
      orderBy: { date: 'desc' },
      select: { invoiceNo: true },
    });

    let sequence = 1;
    if (lastInvoice && lastInvoice.invoiceNo) {
      const match = lastInvoice.invoiceNo.match(/INV-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `INV-${String(sequence).padStart(6, '0')}`;
  }

  // Create a new purchase order (legacy)
  async createPurchaseOrder(req: AuthRequest, res: Response) {
    try {
      const {
        supplierId,
        items,
        expectedDate,
        notes,
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!supplierId) {
        return res.status(400).json({ error: 'Supplier ID is required' });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
      }

      // Check if supplier exists
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
      });

      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      // Calculate totals
      let subtotal = 0;
      let totalTax = 0;
      const purchaseItems = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return res.status(404).json({ error: `Product ${item.productId} not found` });
        }

        const itemTotal = item.unitCost * item.quantity;
        const itemTax = itemTotal * (product.taxRate / 100);

        subtotal += itemTotal;
        totalTax += itemTax;

        purchaseItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: itemTotal,
        });
      }

      const totalAmount = subtotal + totalTax;

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create purchase order
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          userId,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          subtotal,
          taxAmount: totalTax,
          totalAmount,
          notes,
          status: PurchaseStatus.PENDING, // Using the enum correctly
          purchaseItems: {
            create: purchaseItems,
          },
        },
        include: {
          supplier: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PURCHASE_ORDER_CREATED',
          entity: 'PURCHASE_ORDER',
          entityId: purchaseOrder.id,
          details: {
            orderNumber: purchaseOrder.orderNumber,
            supplierId,
            totalAmount: purchaseOrder.totalAmount,
            items: purchaseItems.length,
          },
        },
      });

      return res.status(201).json({
        message: 'Purchase order created successfully',
        data: purchaseOrder,
      });
    } catch (error) {
      console.error('Error creating purchase order:', error);
      return res.status(500).json({ error: 'Failed to create purchase order' });
    }
  }

  // Generate order number (sequential) - legacy
  async generateOrderNumber(): Promise<string> {
    const lastOrder = await prisma.purchaseOrder.findFirst({
      orderBy: { orderDate: 'desc' },
      select: { orderNumber: true },
    });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/PO-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `PO-${String(sequence).padStart(5, '0')}`;
  }

  // Get all purchase orders (legacy)
  async getAllPurchaseOrders(req: Request, res: Response) {
    try {
      const { status, supplierId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (supplierId) {
        where.supplierId = supplierId;
      }

      if (startDate) {
        where.orderDate = { gte: new Date(startDate as string) };
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.orderDate = { ...where.orderDate, lte: end };
      }

      const [orders, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            supplier: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            purchaseItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { orderDate: 'desc' },
          skip,
          take,
        }),
        prisma.purchaseOrder.count({ where }),
      ]);

      return res.json({
        data: orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
  }

  // Get purchase order by ID (legacy)
  async getPurchaseOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      return res.json(order);
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
  }

  // Receive purchase order (create batches) - legacy
  async receivePurchaseOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { receivedItems, notes } = req.body;

      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          purchaseItems: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      if (order.status === PurchaseStatus.RECEIVED) {
        return res.status(400).json({ error: 'Purchase order already received' });
      }

      if (order.status === PurchaseStatus.CANCELLED) {
        return res.status(400).json({ error: 'Purchase order is cancelled' });
      }

      if (!receivedItems || receivedItems.length === 0) {
        return res.status(400).json({ error: 'Received items are required' });
      }

      // Create batches for received items
      const batches = [];
      for (const item of receivedItems) {
        const purchaseItem = order.purchaseItems.find(pi => pi.productId === item.productId);

        if (!purchaseItem) {
          return res.status(404).json({ error: `Product ${item.productId} not in purchase order` });
        }

        // Check if product already has a batch with this number
        const existingBatch = await prisma.batch.findUnique({
          where: {
            batchNumber_productId: {
              batchNumber: item.batchNumber,
              productId: item.productId,
            },
          },
        });

        if (existingBatch) {
          return res.status(409).json({
            error: `Batch ${item.batchNumber} already exists for this product`,
          });
        }

        // Create batch
        const batch = await prisma.batch.create({
          data: {
            batchNumber: item.batchNumber,
            productId: item.productId,
            supplierId: order.supplierId,
            quantity: item.quantityReceived || purchaseItem.quantity,
            initialQuantity: item.quantityReceived || purchaseItem.quantity,
            costPrice: item.unitCost || purchaseItem.unitCost,
            sellingPrice: item.sellingPrice || purchaseItem.unitCost * 1.5,
            expiryDate: new Date(item.expiryDate),
            dateReceived: new Date(),
            isConfirmed: true,
          },
        });

        batches.push(batch);

        // Update purchase item with batch info
        await prisma.purchaseItem.update({
          where: { id: purchaseItem.id },
          data: {
            batchNumber: item.batchNumber,
            batchId: batch.id,
          },
        });

        // Update product stock
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantityReceived || purchaseItem.quantity,
            },
          },
        });
      }

      // Update purchase order status
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseStatus.RECEIVED,
          receivedDate: new Date(),
          notes: notes || order.notes,
        },
        include: {
          supplier: true,
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_ORDER_RECEIVED',
          entity: 'PURCHASE_ORDER',
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            batches: batches.length,
          },
        },
      });

      return res.json({
        message: 'Purchase order received successfully',
        data: {
          purchaseOrder: updatedOrder,
          batches,
        },
      });
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      return res.status(500).json({ error: 'Failed to receive purchase order' });
    }
  }

  // Cancel purchase order (legacy)
  async cancelPurchaseOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!order) {
        return res.status(404).json({ error: 'Purchase order not found' });
      }

      if (order.status === PurchaseStatus.RECEIVED) {
        return res.status(400).json({ error: 'Cannot cancel a received order' });
      }

      if (order.status === PurchaseStatus.CANCELLED) {
        return res.status(400).json({ error: 'Purchase order already cancelled' });
      }

      const cancelledOrder = await prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: PurchaseStatus.CANCELLED,
          notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}` : order.notes,
        },
        include: {
          supplier: true,
          purchaseItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_ORDER_CANCELLED',
          entity: 'PURCHASE_ORDER',
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            reason: reason || 'No reason provided',
          },
        },
      });

      return res.json({
        message: 'Purchase order cancelled successfully',
        data: cancelledOrder,
      });
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      return res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
  }

  // Get purchase order summary/dashboard data (legacy)
  async getPurchaseSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate) {
        where.orderDate = { gte: new Date(startDate as string) };
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.orderDate = { ...where.orderDate, lte: end };
      }

      const [totalOrders, pendingOrders, receivedOrders, cancelledOrders, totalSpent] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.count({ where: { ...where, status: PurchaseStatus.PENDING } }),
        prisma.purchaseOrder.count({ where: { ...where, status: PurchaseStatus.RECEIVED } }),
        prisma.purchaseOrder.count({ where: { ...where, status: PurchaseStatus.CANCELLED } }),
        prisma.purchaseOrder.aggregate({
          where: { ...where, status: PurchaseStatus.RECEIVED },
          _sum: { totalAmount: true },
        }),
      ]);

      // Get top suppliers by order volume
      const topSuppliers = await prisma.purchaseOrder.groupBy({
        by: ['supplierId'],
        where,
        _sum: { totalAmount: true },
        _count: true,
        orderBy: {
          _sum: { totalAmount: 'desc' },
        },
        take: 5,
      });

      // Get supplier names
      const supplierIds = topSuppliers.map(s => s.supplierId);
      const suppliers = await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true, code: true },
      });

      const topSuppliersWithNames = topSuppliers.map(s => ({
        ...s,
        supplier: suppliers.find(prod => prod.id === s.supplierId),
      }));

      return res.json({
        totalOrders,
        pendingOrders,
        receivedOrders,
        cancelledOrders,
        totalSpent: totalSpent._sum.totalAmount || 0,
        topSuppliers: topSuppliersWithNames,
      });
    } catch (error) {
      console.error('Error fetching purchase summary:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase summary' });
    }
  }

  // ============= PURCHASE INVOICE LIST METHODS =============

  /**
   * Get all purchase invoices with filters
   */
  async getAllPurchaseInvoices(req: Request, res: Response) {
    try {
      const { status, supplierId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (supplierId) {
        where.supplierId = supplierId;
      }

      if (startDate) {
        where.date = { gte: new Date(startDate as string) };
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.date = { ...where.date, lte: end };
      }

      const [invoices, total] = await Promise.all([
        prisma.purchaseInvoice.findMany({
          where,
          include: {
            supplier: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          skip,
          take,
        }),
        prisma.purchaseInvoice.count({ where }),
      ]);

      return res.json({
        data: invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase invoices' });
    }
  }

  /**
   * Get single purchase invoice by ID
   */
  async getPurchaseInvoiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const invoice = await prisma.purchaseInvoice.findUnique({
        where: { id },
        include: {
          supplier: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Purchase invoice not found' });
      }

      return res.json(invoice);
    } catch (error) {
      console.error('Error fetching purchase invoice:', error);
      return res.status(500).json({ error: 'Failed to fetch purchase invoice' });
    }
  }

  /**
   * Cancel a purchase invoice
   */
  async cancelPurchaseInvoice(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const invoice = await prisma.purchaseInvoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Purchase invoice not found' });
      }

      if (invoice.status === PurchaseStatus.CANCELLED) {
        return res.status(400).json({ error: 'Invoice is already cancelled' });
      }

      const cancelled = await prisma.purchaseInvoice.update({
        where: { id },
        data: {
          status: PurchaseStatus.CANCELLED,
          notes: reason ? `${invoice.notes || ''}\nCancellation: ${reason}` : invoice.notes,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_INVOICE_CANCELLED',
          entity: 'PURCHASE_INVOICE',
          entityId: id,
          details: {
            invoiceNo: invoice.invoiceNo,
            reason: reason || 'No reason provided',
          },
        },
      });

      return res.json({
        message: 'Purchase invoice cancelled successfully',
        data: cancelled,
      });
    } catch (error) {
      console.error('Error cancelling purchase invoice:', error);
      return res.status(500).json({ error: 'Failed to cancel purchase invoice' });
    }
  }
}
