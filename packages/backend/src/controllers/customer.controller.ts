// packages/backend/src/controllers/customer.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class CustomerController {
  // ============ CUSTOMERS ============

  async getAll(req: Request, res: Response) {
    try {
      const { search, type } = req.query;
      const where: any = { isDeleted: false };

      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search) } },
          { code: { contains: String(search), mode: 'insensitive' } },
        ];
      }
      if (type) {
        where.customerType = String(type);
      }

      const customers = await prisma.customer.findMany({
        where,
        include: {
          account: true,
          _count: { select: { transactions: true, deliveries: true, sales: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ data: customers });
    } catch (error) {
      console.error('Get customers error:', error);
      return res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          account: { include: { transactions: { orderBy: { createdAt: 'desc' } } } },
          deliveries: { orderBy: { deliveryDate: 'desc' } },
          patientRecords: { orderBy: { recordedAt: 'desc' } },
          sales: { orderBy: { saleDate: 'desc' }, take: 20 },
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.json(customer);
    } catch (error) {
      console.error('Get customer error:', error);
      return res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { name, phone, email, address, customerType, notes } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      // Generate customer code
      const count = await prisma.customer.count();
      const code = `CUS-${String(count + 1).padStart(4, '0')}`;

      const customer = await prisma.customer.create({
        data: {
          code,
          name,
          phone,
          email,
          address,
          customerType: customerType || 'REGULAR',
          notes,
        },
        include: { account: true },
      });

      // Auto-create a customer account
      await prisma.customerAccount.create({
        data: {
          customerId: customer.id,
          accountType: 'DEBIT',
          balance: 0,
          creditLimit: 0,
        },
      });

      return res.status(201).json({ message: 'Customer created', data: customer });
    } catch (error) {
      console.error('Create customer error:', error);
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, phone, email, address, customerType, isActive, notes } = req.body;

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          name,
          phone,
          email,
          address,
          customerType,
          isActive,
          notes,
        },
      });

      return res.json({ message: 'Customer updated', data: customer });
    } catch (error) {
      console.error('Update customer error:', error);
      return res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.customer.update({
        where: { id },
        data: { isDeleted: true, isActive: false },
      });
      return res.json({ message: 'Customer deleted' });
    } catch (error) {
      console.error('Delete customer error:', error);
      return res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  // ============ CUSTOMER ACCOUNTS (DEBIT/CREDIT) ============

  async getAccount(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const account = await prisma.customerAccount.findUnique({
        where: { customerId },
        include: {
          transactions: { orderBy: { createdAt: 'desc' } },
          customer: true,
        },
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.json(account);
    } catch (error) {
      console.error('Get account error:', error);
      return res.status(500).json({ error: 'Failed to fetch account' });
    }
  }

  async addTransaction(req: AuthRequest, res: Response) {
    try {
      const { customerId } = req.params;
      const { type, amount, reference, description, saleId } = req.body;

      if (!type || !amount) {
        return res.status(400).json({ error: 'Type and amount are required' });
      }

      const account = await prisma.customerAccount.findUnique({
        where: { customerId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      // Calculate new balance
      let newBalance = account.balance;
      if (type === 'PAYMENT' || type === 'CREDIT') {
        newBalance -= amount;
      } else if (type === 'DEBIT') {
        newBalance += amount;
      } else if (type === 'ADJUSTMENT') {
        newBalance = amount;
      }

      const transaction = await prisma.customerTransaction.create({
        data: {
          customerId,
          accountId: account.id,
          type,
          amount,
          balanceAfter: newBalance,
          reference,
          description,
          saleId,
          createdBy: req.user?.id,
        },
      });

      await prisma.customerAccount.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      return res.status(201).json({ message: 'Transaction recorded', data: transaction });
    } catch (error) {
      console.error('Add transaction error:', error);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }
  }

  // ============ DELIVERY SCHEDULES ============

  async getDeliveries(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const deliveries = await prisma.deliverySchedule.findMany({
        where: { customerId, isDeleted: false },
        include: { product: true, customer: true },
        orderBy: { deliveryDate: 'desc' },
      });
      return res.json({ data: deliveries });
    } catch (error) {
      console.error('Get deliveries error:', error);
      return res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
  }

  async createDelivery(req: AuthRequest, res: Response) {
    try {
      const { customerId } = req.params;
      const { productId, deliveryDate, quantity, address, notes } = req.body;

      if (!deliveryDate || !quantity) {
        return res.status(400).json({ error: 'Delivery date and quantity are required' });
      }

      const delivery = await prisma.deliverySchedule.create({
        data: {
          customerId,
          productId,
          deliveryDate: new Date(deliveryDate),
          quantity,
          address,
          notes,
        },
        include: { product: true, customer: true },
      });

      return res.status(201).json({ message: 'Delivery scheduled', data: delivery });
    } catch (error) {
      console.error('Create delivery error:', error);
      return res.status(500).json({ error: 'Failed to schedule delivery' });
    }
  }

  async updateDeliveryStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, deliveredBy } = req.body;

      const delivery = await prisma.deliverySchedule.update({
        where: { id },
        data: {
          status,
          deliveredBy,
          deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        },
      });

      return res.json({ message: 'Delivery updated', data: delivery });
    } catch (error) {
      console.error('Update delivery error:', error);
      return res.status(500).json({ error: 'Failed to update delivery' });
    }
  }
}