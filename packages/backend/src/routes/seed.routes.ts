// packages/backend/src/routes/seed.routes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', async (req, res) => {
  try {
    const stats = {
      users: await prisma.user.count(),
      products: await prisma.product.count(),
      batches: await prisma.batch.count(),
      suppliers: await prisma.supplier.count(),
      insuranceCompanies: await prisma.insuranceCompany.count(),
    };
    
    res.json({
      status: 'OK',
      database: 'Connected',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;