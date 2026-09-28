// packages/backend/src/controllers/sale.controller.ts
import { Request, Response } from 'express';
import { PrismaClient, PaymentMethod, RRAStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class SaleController {
  // Create a new sale
  async createSale(req: AuthRequest, res: Response) {
    try {
      const {
        items,
        customerName,
        customerPhone,
        customerEmail,
        paymentMethod,
        paymentReference,
        discount = 0,
        discountType = 'FIXED',
        insuranceCompanyId,
        patientName,
        patientId,
        policyNumber,
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'At least one item is required' });
      }

      // Calculate totals and validate stock
      let subtotal = 0;
      let totalTax = 0;
      const saleItems: any[] = [];

      for (const item of items) {
        const batch = await prisma.batch.findUnique({
          where: { id: item.batchId },
          include: { product: true },
        });

        if (!batch) {
          return res.status(404).json({ error: `Batch ${item.batchId} not found` });
        }

        if (batch.quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${batch.product.name}. Available: ${batch.quantity}`,
          });
        }

        const itemTotal = item.unitPrice * item.quantity;
        const itemTax = itemTotal * (batch.product.taxRate / 100);

        subtotal += itemTotal;
        totalTax += itemTax;

        saleItems.push({
          batchId: item.batchId,
          productId: batch.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          discount: item.discount || 0,
        });
      }

      // Calculate discount
      let discountAmount = 0;
      if (discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * discount) / 100;
      } else {
        discountAmount = discount;
      }

      const totalAmount = subtotal  - discountAmount;

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create sale
      const sale = await prisma.sale.create({
        data: {
          invoiceNumber,
          userId,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '',
          customerEmail: customerEmail || '',
          subtotal,
          taxAmount: 0,
          discount: discountAmount,
          discountType,
          totalAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentReference: paymentReference || '',
          rraStatus: RRAStatus.PENDING,
          saleItems: {
            create: saleItems,
          },
        },
        include: {
          saleItems: {
            include: {
              batch: {
                include: {
                  product: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update batch quantities (deduct stock)
      for (const item of items) {
        await prisma.batch.update({
          where: { id: item.batchId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Handle insurance claim if applicable
      let insuranceClaim = null;
      if (paymentMethod === 'INSURANCE' && insuranceCompanyId) {
        const insuranceCompany = await prisma.insuranceCompany.findUnique({
          where: { id: insuranceCompanyId },
        });

        if (insuranceCompany) {
          const coverageAmount = totalAmount * (insuranceCompany.coveragePercentage / 100);
          const copayAmount = totalAmount - coverageAmount;

          const claimNumber = `CLM-${Date.now()}`;

          insuranceClaim = await prisma.insuranceClaim.create({
            data: {
              claimNumber,
              saleId: sale.id,
              patientName: patientName || customerName || 'Unknown',
              patientId: patientId || '',
              patientPhone: customerPhone || '',
              policyNumber: policyNumber || '',
              insuranceCompanyId,
              claimAmount: totalAmount,
              coverageAmount,
              copayAmount,
              status: 'SUBMITTED',
              submittedAt: new Date(),
            },
          });

          await prisma.sale.update({
            where: { id: sale.id },
            data: {
              insuranceClaim: {
                connect: { id: insuranceClaim.id },
              },
            },
          });
        }
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SALE_CREATED',
          entity: 'SALE',
          entityId: sale.id,
          details: {
            invoiceNumber: sale.invoiceNumber,
            totalAmount: sale.totalAmount,
            items: saleItems.length,
            paymentMethod,
          },
        },
      });

      return res.status(201).json({
        message: 'Sale created successfully',
        data: {
          sale,
          insuranceClaim,
        },
      });
    } catch (error) {
      console.error('Error creating sale:', error);
      return res.status(500).json({ error: 'Failed to create sale' });
    }
  }

  // Generate invoice number (sequential)
  async generateInvoiceNumber(): Promise<string> {
    const lastSale = await prisma.sale.findFirst({
      orderBy: { saleDate: 'desc' },
      select: { invoiceNumber: true },
    });

    let sequence = 1;
    if (lastSale && lastSale.invoiceNumber) {
      const match = lastSale.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `INV-${String(sequence).padStart(5, '0')}`;
  }

  // Get all sales with filters
  async getAllSales(req: Request, res: Response) {
    try {
      const { startDate, endDate, paymentMethod, page = 1, limit = 20 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (startDate) {
        where.saleDate = { gte: new Date(startDate as string) };
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.saleDate = { ...where.saleDate, lte: end };
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod;
      }

      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
          where,
          include: {
            saleItems: {
              include: {
                batch: {
                  include: {
                    product: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                      },
                    },
                  },
                },
              },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            insuranceClaim: {
              include: {
                insuranceCompany: true,
              },
            },
          },
          orderBy: { saleDate: 'desc' },
          skip,
          take,
        }),
        prisma.sale.count({ where }),
      ]);

      return res.json({
        data: sales,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
      return res.status(500).json({ error: 'Failed to fetch sales' });
    }
  }

  // Get sale by ID
  async getSaleById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          saleItems: {
            include: {
              batch: {
                include: {
                  product: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          insuranceClaim: {
            include: {
              insuranceCompany: true,
            },
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      return res.json(sale);
    } catch (error) {
      console.error('Error fetching sale:', error);
      return res.status(500).json({ error: 'Failed to fetch sale' });
    }
  }

  // Get sale by invoice number
  async getSaleByInvoiceNumber(req: Request, res: Response) {
    try {
      const { invoiceNumber } = req.params;

      const sale = await prisma.sale.findUnique({
        where: { invoiceNumber },
        include: {
          saleItems: {
            include: {
              batch: {
                include: {
                  product: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          insuranceClaim: {
            include: {
              insuranceCompany: true,
            },
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      return res.json(sale);
    } catch (error) {
      console.error('Error fetching sale:', error);
      return res.status(500).json({ error: 'Failed to fetch sale' });
    }
  }

  // Cancel a sale
  async cancelSale(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
          saleItems: {
            include: {
              batch: true,
            },
          },
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      if (sale.isCancelled) {
        return res.status(400).json({ error: 'Sale is already cancelled' });
      }

      // Restore stock
      for (const item of sale.saleItems) {
        await prisma.batch.update({
          where: { id: item.batchId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Update sale
      const cancelledSale = await prisma.sale.update({
        where: { id },
        data: {
          isCancelled: true,
          cancellationReason: reason || 'Cancelled by user',
          cancelledAt: new Date(),
          rraStatus: RRAStatus.CANCELLED,
        },
        include: {
          saleItems: {
            include: {
              batch: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'SALE_CANCELLED',
          entity: 'SALE',
          entityId: sale.id,
          details: {
            invoiceNumber: sale.invoiceNumber,
            reason: reason || 'Cancelled by user',
          },
        },
      });

      return res.json({
        message: 'Sale cancelled successfully',
        data: cancelledSale,
      });
    } catch (error) {
      console.error('Error cancelling sale:', error);
      return res.status(500).json({ error: 'Failed to cancel sale' });
    }
  }

  // ==================== SALES SUMMARY ====================

  async getSalesSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate) {
        where.saleDate = { gte: new Date(startDate as string) };
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.saleDate = { ...where.saleDate, lte: end };
      }

      const [totalSales, totalItems, salesByPaymentMethod, topProducts] = await Promise.all([
        prisma.sale.aggregate({
          where,
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.saleItem.aggregate({
          where: {
            sale: where,
          },
          _sum: { quantity: true },
        }),
        prisma.sale.groupBy({
          by: ['paymentMethod'],
          where,
          _sum: { totalAmount: true },
          _count: true,
        }),
        prisma.saleItem.groupBy({
          by: ['productId'],
          where: {
            sale: where,
          },
          _sum: { quantity: true },
          orderBy: {
            _sum: { quantity: 'desc' },
          },
          take: 5,
        }),
      ]);

      // Get product names for top products
      const topProductIds = topProducts.map(p => p.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, code: true },
      });

      const topProductsWithNames = topProducts.map(p => ({
        ...p,
        product: products.find(prod => prod.id === p.productId),
      }));

      return res.json({
        totalSales: totalSales._sum.totalAmount || 0,
        totalTransactions: totalSales._count,
        totalItemsSold: totalItems._sum.quantity || 0,
        salesByPaymentMethod,
        topProducts: topProductsWithNames,
      });
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      return res.status(500).json({ error: 'Failed to fetch sales summary' });
    }
  }
}