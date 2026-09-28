-- CreateEnum for sync action tracking
CREATE TYPE "SyncAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED');

-- CreateTable for sync metadata
CREATE TABLE "sync_metadata" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "action" "SyncAction" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for sync_metadata
CREATE INDEX "sync_metadata_modelName_idx" ON "sync_metadata"("modelName");
CREATE INDEX "sync_metadata_syncedAt_idx" ON "sync_metadata"("syncedAt");
CREATE INDEX "sync_metadata_deviceId_idx" ON "sync_metadata"("deviceId");

-- ============ ADD SYNC FIELDS TO ALL TABLES ============

-- Users
ALTER TABLE "users" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "users" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Products
ALTER TABLE "products" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "products" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Batches
ALTER TABLE "batches" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "batches" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "batches" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "batches" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Suppliers
ALTER TABLE "suppliers" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "suppliers" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "suppliers" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Supplier Products
ALTER TABLE "supplier_products" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "supplier_products" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "supplier_products" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "supplier_products" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Purchase Invoices
ALTER TABLE "purchase_invoices" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "purchase_invoices" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "purchase_invoices" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_invoices" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Purchase Invoice Items
ALTER TABLE "purchase_invoice_items" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "purchase_invoice_items" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "purchase_invoice_items" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_invoice_items" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Sales
ALTER TABLE "sales" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "sales" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "sales" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Purchase Orders
ALTER TABLE "purchase_orders" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "purchase_orders" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_orders" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Insurance Companies
ALTER TABLE "insurance_companies" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "insurance_companies" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "insurance_companies" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "insurance_companies" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Insurance Coverage Rules
ALTER TABLE "insurance_coverage_rules" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "insurance_coverage_rules" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "insurance_coverage_rules" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "insurance_coverage_rules" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Insurance Claims
ALTER TABLE "insurance_claims" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "insurance_claims" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "insurance_claims" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "insurance_claims" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Stock Adjustments
ALTER TABLE "stock_adjustments" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stock_adjustments" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "stock_adjustments" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "stock_adjustments" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Audit Logs
ALTER TABLE "audit_logs" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "audit_logs" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "audit_logs" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Price Change History
ALTER TABLE "price_change_history" ADD COLUMN "syncVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "price_change_history" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "price_change_history" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "price_change_history" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

