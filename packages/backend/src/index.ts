// packages/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import batchRoutes from './routes/batch.routes';
import supplierRoutes from './routes/supplier.routes';
import saleRoutes from './routes/sale.routes';
import purchaseRoutes from './routes/purchase.routes';
import insuranceRoutes from './routes/insurance.routes';
import reportRoutes from './routes/report.routes';
import auditRoutes from './routes/audit.routes';
import seedRoutes from './routes/seed.routes';
import rraRoutes from './routes/rra.routes';
import rraFiscalRoutes from './routes/rra.fiscal.routes';
import rssbRoutes from './routes/rssb.routes';
import notificationRoutes from './routes/notification.routes';
import supplierProductRoutes from './routes/supplier.Product.routes';
import syncRoutes from './routes/sync.routes';
import customerRoutes from './routes/customer.routes';
import collaboratorRoutes from './routes/collaborator.routes';
import calculatorRoutes from './routes/calculator.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authenticate } from './middleware/auth.middleware';
import { rateLimiter } from './middleware/rateLimiter.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Pharmacy Management System API',
    version: '1.0.0',
  });
});

// ============= PUBLIC ROUTES =============
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/seed', seedRoutes);

// Sync routes — use device-based auth (deviceId), no JWT required
app.use('/api/sync', syncRoutes);
app.use('/api/v1/sync', syncRoutes);

// ============= PROTECTED ROUTES (Authentication Required) =============
app.use('/api/users', authenticate, userRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/batches', authenticate, batchRoutes);
app.use('/api/suppliers', authenticate, supplierRoutes);
app.use('/api/sales', authenticate, saleRoutes);
app.use('/api/purchases', authenticate, purchaseRoutes);
app.use('/api/insurance', authenticate, insuranceRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/audit', authenticate, auditRoutes);
app.use('/api/rra', authenticate, rraRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/supplier-products', authenticate, supplierProductRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/collaborators', authenticate, collaboratorRoutes);
app.use('/api/calculator', authenticate, calculatorRoutes);
app.use('/api/v1/customers', authenticate, customerRoutes);
app.use('/api/v1/collaborators', authenticate, collaboratorRoutes);
app.use('/api/v1/calculator', authenticate, calculatorRoutes);
app.use('/api/v1/users', authenticate, userRoutes);
app.use('/api/v1/products', authenticate, productRoutes);
app.use('/api/v1/batches', authenticate, batchRoutes);
app.use('/api/v1/suppliers', authenticate, supplierRoutes);
app.use('/api/v1/sales', authenticate, saleRoutes);
app.use('/api/v1/purchases', authenticate, purchaseRoutes);
app.use('/api/v1/insurance', authenticate, insuranceRoutes);
app.use('/api/v1/reports', authenticate, reportRoutes);
app.use('/api/v1/audit', authenticate, auditRoutes);
app.use('/api/v1/rra', authenticate, rraRoutes);
app.use('/api/v1/rra-fiscal', authenticate, rraFiscalRoutes);
app.use('/api/v1/rssb', authenticate, rssbRoutes);
app.use('/api/v1/notifications', authenticate, notificationRoutes);
app.use('/api/v1/supplier-products', authenticate, supplierProductRoutes);

// New Compliance Routes
app.use('/api/rra-fiscal', authenticate, rraFiscalRoutes);
app.use('/api/rssb', authenticate, rssbRoutes);

// ============= ERROR HANDLING =============
app.use(errorHandler);

// ============= START SERVER =============
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📋 API Documentation: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, closing server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, closing server...');
  process.exit(0);
});