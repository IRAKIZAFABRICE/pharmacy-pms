"use strict";
// packages/backend/src/services/sync.service.ts
// Central sync service for offline-first multi-user support
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushChanges = pushChanges;
exports.pullChanges = pullChanges;
exports.registerDevice = registerDevice;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Map model names to Prisma delegates for dynamic access
const MODEL_MAP = {
    users: prisma.user,
    products: prisma.product,
    batches: prisma.batch,
    suppliers: prisma.supplier,
    supplier_products: prisma.supplierProduct,
    purchase_invoices: prisma.purchaseInvoice,
    purchase_invoice_items: prisma.purchaseInvoiceItem,
    sales: prisma.sale,
    sale_items: prisma.saleItem,
    purchase_orders: prisma.purchaseOrder,
    purchase_items: prisma.purchaseItem,
    insurance_companies: prisma.insuranceCompany,
    insurance_coverage_rules: prisma.insuranceCoverageRule,
    insurance_claims: prisma.insuranceClaim,
    stock_adjustments: prisma.stockAdjustment,
    audit_logs: prisma.auditLog,
    notifications: prisma.notification,
    price_change_history: prisma.priceChangeHistory,
};
/**
 * Push local changes to the central server.
 * Uses last-write-wins conflict resolution based on syncVersion.
 */
async function pushChanges(request) {
    let accepted = 0;
    let conflicts = 0;
    for (const change of request.changes) {
        const delegate = MODEL_MAP[change.model];
        if (!delegate) {
            console.warn(`[Sync] Unknown model: ${change.model}`);
            continue;
        }
        try {
            if (change.action === 'DELETED') {
                // Soft delete: mark as deleted
                await delegate.update({
                    where: { id: change.record.id },
                    data: {
                        isDeleted: true,
                        syncVersion: { increment: 1 },
                        deviceId: request.deviceId,
                        lastSyncedAt: new Date(),
                    },
                });
                accepted++;
            }
            else {
                // Upsert with conflict detection
                await delegate.upsert({
                    where: { id: change.record.id },
                    update: {
                        ...change.record,
                        syncVersion: { increment: 1 },
                        deviceId: request.deviceId,
                        lastSyncedAt: new Date(),
                    },
                    create: {
                        ...change.record,
                        syncVersion: 1,
                        deviceId: request.deviceId,
                        lastSyncedAt: new Date(),
                    },
                });
                accepted++;
            }
        }
        catch (err) {
            // Conflict: record was modified by another device
            if (err.code === 'P2025' || err.message?.includes('Record to update not found')) {
                conflicts++;
            }
            else {
                console.error(`[Sync] Error processing ${change.model}/${change.record.id}:`, err.message);
                conflicts++;
            }
        }
    }
    return { accepted, conflicts };
}
/**
 * Models that have an `updatedAt` field (with @updatedAt decorator).
 * These can be filtered by updatedAt in sync queries.
 */
const MODELS_WITH_UPDATED_AT = new Set([
    'users', 'products', 'suppliers', 'supplier_products',
    'purchase_invoices', 'purchase_invoice_items',
    'insurance_companies', 'insurance_coverage_rules', 'insurance_claims',
]);
/**
 * Models that have sync fields (syncVersion, deviceId, isDeleted, lastSyncedAt).
 * SaleItem and PurchaseItem are child-only models synced via their parent and excluded from direct sync.
 */
const MODELS_WITH_SYNC_FIELDS = new Set([
    'users', 'products', 'batches', 'suppliers', 'supplier_products',
    'purchase_invoices', 'purchase_invoice_items',
    'sales', 'purchase_orders',
    'insurance_companies', 'insurance_coverage_rules', 'insurance_claims',
    'stock_adjustments', 'audit_logs', 'price_change_history',
]);
/**
 * Pull changes from the central server since last sync.
 */
async function pullChanges(request) {
    const since = request.lastSyncedAt ? new Date(request.lastSyncedAt) : new Date(0);
    const changes = [];
    for (const [modelName, delegate] of Object.entries(MODEL_MAP)) {
        try {
            // Skip models without sync fields (they're synced via parent records)
            if (!MODELS_WITH_SYNC_FIELDS.has(modelName)) {
                continue;
            }
            // Build filter: use updatedAt if model has it, otherwise use lastSyncedAt
            const filter = MODELS_WITH_UPDATED_AT.has(modelName)
                ? { OR: [{ updatedAt: { gt: since } }, { lastSyncedAt: null }] }
                : { lastSyncedAt: { lt: new Date() } }; // Pull all records with non-null lastSyncedAt
            const records = await delegate.findMany({
                where: filter,
                take: 1000, // paginate large datasets
            });
            for (const record of records) {
                const action = record.isDeleted ? 'DELETED' : 'UPDATED';
                changes.push({
                    model: modelName,
                    action,
                    record,
                    version: record.syncVersion || 0,
                });
            }
        }
        catch (err) {
            console.warn(`[Sync] Error pulling ${modelName}:`, err.message);
        }
    }
    return {
        changes,
        serverTime: new Date().toISOString(),
    };
}
/**
 * Get device registration info for a new device.
 * Uses camelCase column names matching Prisma schema field names.
 */
async function registerDevice(deviceId, deviceName) {
    return prisma.$queryRaw `
    INSERT INTO sync_metadata (id, "modelName", "recordId", "deviceId", action, version, "createdAt")
    VALUES (gen_random_uuid(), 'device', ${deviceId}, ${deviceId}, 'CREATED', 1, NOW())
    ON CONFLICT DO NOTHING
  `;
}
//# sourceMappingURL=sync.service.js.map