// packages/backend/src/controllers/collaborator.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class CollaboratorController {
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
        where.type = String(type);
      }

      const collaborators = await prisma.collaborator.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return res.json({ data: collaborators });
    } catch (error) {
      console.error('Get collaborators error:', error);
      return res.status(500).json({ error: 'Failed to fetch collaborators' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const collaborator = await prisma.collaborator.findUnique({
        where: { id },
      });

      if (!collaborator) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }

      return res.json(collaborator);
    } catch (error) {
      console.error('Get collaborator error:', error);
      return res.status(500).json({ error: 'Failed to fetch collaborator' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { name, type, phone, email, address, licenseNumber, specialization, institutionName, notes } = req.body;

      if (!name || !type || !phone) {
        return res.status(400).json({ error: 'Name, type, and phone are required' });
      }

      const count = await prisma.collaborator.count();
      const code = `COL-${String(count + 1).padStart(4, '0')}`;

      const collaborator = await prisma.collaborator.create({
        data: {
          code,
          name,
          type,
          phone,
          email,
          address,
          licenseNumber,
          specialization,
          institutionName,
          notes,
        },
      });

      return res.status(201).json({ message: 'Collaborator created', data: collaborator });
    } catch (error) {
      console.error('Create collaborator error:', error);
      return res.status(500).json({ error: 'Failed to create collaborator' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, phone, email, address, licenseNumber, specialization, institutionName, isActive, notes } = req.body;

      const collaborator = await prisma.collaborator.update({
        where: { id },
        data: {
          name,
          type,
          phone,
          email,
          address,
          licenseNumber,
          specialization,
          institutionName,
          isActive,
          notes,
        },
      });

      return res.json({ message: 'Collaborator updated', data: collaborator });
    } catch (error) {
      console.error('Update collaborator error:', error);
      return res.status(500).json({ error: 'Failed to update collaborator' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.collaborator.update({
        where: { id },
        data: { isDeleted: true, isActive: false },
      });
      return res.json({ message: 'Collaborator deleted' });
    } catch (error) {
      console.error('Delete collaborator error:', error);
      return res.status(500).json({ error: 'Failed to delete collaborator' });
    }
  }
}