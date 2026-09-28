"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const batch_routes_1 = __importDefault(require("./routes/batch.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const sale_routes_1 = __importDefault(require("./routes/sale.routes"));
const purchase_routes_1 = __importDefault(require("./routes/purchase.routes"));
const insurance_routes_1 = __importDefault(require("./routes/insurance.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const audit_routes_1 = __importDefault(require("./routes/audit.routes"));
const seed_routes_1 = __importDefault(require("./routes/seed.routes"));
const rra_routes_1 = __importDefault(require("./routes/rra.routes"));
const rra_fiscal_routes_1 = __importDefault(require("./routes/rra.fiscal.routes"));
const rssb_routes_1 = __importDefault(require("./routes/rssb.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const supplier_Product_routes_1 = __importDefault(require("./routes/supplier.Product.routes"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
// Import middleware
const error_middleware_1 = require("./middleware/error.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
app.use('/api', rateLimiter_middleware_1.rateLimiter);
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/seed', seed_routes_1.default);
// Sync routes — use device-based auth (deviceId), no JWT required
app.use('/api/sync', sync_routes_1.default);
app.use('/api/v1/sync', sync_routes_1.default);
// ============= PROTECTED ROUTES (Authentication Required) =============
app.use('/api/users', auth_middleware_1.authenticate, user_routes_1.default);
app.use('/api/products', auth_middleware_1.authenticate, product_routes_1.default);
app.use('/api/batches', auth_middleware_1.authenticate, batch_routes_1.default);
app.use('/api/suppliers', auth_middleware_1.authenticate, supplier_routes_1.default);
app.use('/api/sales', auth_middleware_1.authenticate, sale_routes_1.default);
app.use('/api/purchases', auth_middleware_1.authenticate, purchase_routes_1.default);
app.use('/api/insurance', auth_middleware_1.authenticate, insurance_routes_1.default);
app.use('/api/reports', auth_middleware_1.authenticate, report_routes_1.default);
app.use('/api/audit', auth_middleware_1.authenticate, audit_routes_1.default);
app.use('/api/rra', auth_middleware_1.authenticate, rra_routes_1.default);
app.use('/api/notifications', auth_middleware_1.authenticate, notification_routes_1.default);
app.use('/api/supplier-products', auth_middleware_1.authenticate, supplier_Product_routes_1.default);
app.use('/api/v1/users', auth_middleware_1.authenticate, user_routes_1.default);
app.use('/api/v1/products', auth_middleware_1.authenticate, product_routes_1.default);
app.use('/api/v1/batches', auth_middleware_1.authenticate, batch_routes_1.default);
app.use('/api/v1/suppliers', auth_middleware_1.authenticate, supplier_routes_1.default);
app.use('/api/v1/sales', auth_middleware_1.authenticate, sale_routes_1.default);
app.use('/api/v1/purchases', auth_middleware_1.authenticate, purchase_routes_1.default);
app.use('/api/v1/insurance', auth_middleware_1.authenticate, insurance_routes_1.default);
app.use('/api/v1/reports', auth_middleware_1.authenticate, report_routes_1.default);
app.use('/api/v1/audit', auth_middleware_1.authenticate, audit_routes_1.default);
app.use('/api/v1/rra', auth_middleware_1.authenticate, rra_routes_1.default);
app.use('/api/v1/rra-fiscal', auth_middleware_1.authenticate, rra_fiscal_routes_1.default);
app.use('/api/v1/rssb', auth_middleware_1.authenticate, rssb_routes_1.default);
app.use('/api/v1/notifications', auth_middleware_1.authenticate, notification_routes_1.default);
app.use('/api/v1/supplier-products', auth_middleware_1.authenticate, supplier_Product_routes_1.default);
// New Compliance Routes
app.use('/api/rra-fiscal', auth_middleware_1.authenticate, rra_fiscal_routes_1.default);
app.use('/api/rssb', auth_middleware_1.authenticate, rssb_routes_1.default);
// ============= ERROR HANDLING =============
app.use(error_middleware_1.errorHandler);
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
//# sourceMappingURL=index.js.map