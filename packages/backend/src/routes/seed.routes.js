"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/src/routes/seed.routes.ts
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
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
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=seed.routes.js.map