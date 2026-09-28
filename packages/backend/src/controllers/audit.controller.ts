// packages/backend/src/controllers/audit.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class AuditController {
  // Get all audit logs with filters
  async getLogs(req: Request, res: Response) {
    try {
      const {
        action,
        userId,
        entity,
        startDate,
        endDate,
        page = 1,
        limit = 50,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (action) {
        where.action = action;
      }

      if (userId) {
        where.userId = userId;
      }

      if (entity) {
        where.entity = entity;
      }

      if (startDate) {
        where.timestamp = { gte: new Date(startDate as string) };
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.timestamp = { ...where.timestamp, lte: end };
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            sale: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          skip,
          take,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return res.json({
        data: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  // Get audit log by ID
  async getLogById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      if (!log) {
        return res.status(404).json({ error: 'Audit log not found' });
      }

      return res.json(log);
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }

  // Get audit summary
  async getAuditSummary(req: Request, res: Response) {
    try {
      const { days = 7 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      startDate.setHours(0, 0, 0, 0);

      // Total logs count
      const totalLogs = await prisma.auditLog.count({
        where: {
          timestamp: { gte: startDate },
        },
      });

      // Logs by action type
      const logsByAction = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          timestamp: { gte: startDate },
        },
        _count: true,
        orderBy: {
          _count: { action: 'desc' },
        },
        take: 10,
      });

      // Logs by user
      const logsByUser = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          timestamp: { gte: startDate },
          userId: { not: null },
        },
        _count: true,
        orderBy: {
          _count: { userId: 'desc' },
        },
        take: 10,
      });

      // Get user names
      const userIds = logsByUser.map(l => l.userId).filter(Boolean);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds as string[] } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      const logsByUserWithNames = logsByUser.map(log => ({
        ...log,
        user: users.find(u => u.id === log.userId),
      }));

      // Daily breakdown
      const dailyLogs = await prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM audit_logs
        WHERE timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      return res.json({
        period: `${Number(days)} days`,
        summary: {
          totalLogs,
          uniqueUsers: logsByUser.length,
          actions: logsByAction.length,
        },
        topActions: logsByAction,
        topUsers: logsByUserWithNames,
        dailyBreakdown: dailyLogs,
      });
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      return res.status(500).json({ error: 'Failed to fetch audit summary' });
    }
  }
}