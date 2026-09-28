// packages/backend/src/controllers/supplier.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class SupplierController {
  async getAll(req: Request, res: Response) {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      res.json({ data: suppliers });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplier = await prisma.supplier.findUnique({ where: { id } });
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { code, name, tin, email, phone, address, contactPerson } = req.body;
      const supplier = await prisma.supplier.create({
        data: { code, name, tin, email, phone, address, contactPerson },
      });
      res.status(201).json({ message: 'Supplier created', data: supplier });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create supplier' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const supplier = await prisma.supplier.update({
        where: { id },
        data: req.body,
      });
      res.json({ message: 'Supplier updated', data: supplier });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
      res.json({ message: 'Supplier deactivated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  }
}