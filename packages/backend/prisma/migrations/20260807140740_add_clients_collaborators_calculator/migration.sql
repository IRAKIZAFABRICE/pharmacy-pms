-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('REGULAR', 'SPECIAL', 'WHOLESALE', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CollaboratorType" AS ENUM ('PHARMACY', 'DOCTOR', 'HOSPITAL', 'CLINIC', 'HEALTHCARE_INSTITUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PatientRecordType" AS ENUM ('BMI', 'BLOOD_PRESSURE', 'CHOLESTEROL', 'GLUCOSE', 'TEMPERATURE', 'HUMIDITY', 'OTHER');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "customerId" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'REGULAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'DEBIT',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_transactions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "saleId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "customer_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_schedules" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "address" TEXT,
    "notes" TEXT,
    "deliveredBy" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "delivery_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CollaboratorType" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "licenseNumber" TEXT,
    "specialization" TEXT,
    "institutionName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_records" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientAge" INTEGER,
    "patientWeight" DOUBLE PRECISION,
    "patientHeight" DOUBLE PRECISION,
    "recordType" "PatientRecordType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "patient_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dose_calculations" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientAge" INTEGER,
    "patientWeight" DOUBLE PRECISION,
    "medication" TEXT NOT NULL,
    "dosePerKg" DOUBLE PRECISION,
    "calculatedDose" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "frequency" TEXT,
    "duration" TEXT,
    "notes" TEXT,
    "calculatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "dose_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_records" (
    "id" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "readingTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncVersion" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "device_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_code_idx" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_customerType_idx" ON "customers"("customerType");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_customerId_key" ON "customer_accounts"("customerId");

-- CreateIndex
CREATE INDEX "customer_transactions_customerId_idx" ON "customer_transactions"("customerId");

-- CreateIndex
CREATE INDEX "customer_transactions_accountId_idx" ON "customer_transactions"("accountId");

-- CreateIndex
CREATE INDEX "customer_transactions_createdAt_idx" ON "customer_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "delivery_schedules_customerId_idx" ON "delivery_schedules"("customerId");

-- CreateIndex
CREATE INDEX "delivery_schedules_deliveryDate_idx" ON "delivery_schedules"("deliveryDate");

-- CreateIndex
CREATE INDEX "delivery_schedules_status_idx" ON "delivery_schedules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "collaborators_code_key" ON "collaborators"("code");

-- CreateIndex
CREATE INDEX "collaborators_code_idx" ON "collaborators"("code");

-- CreateIndex
CREATE INDEX "collaborators_type_idx" ON "collaborators"("type");

-- CreateIndex
CREATE INDEX "patient_records_customerId_idx" ON "patient_records"("customerId");

-- CreateIndex
CREATE INDEX "patient_records_recordType_idx" ON "patient_records"("recordType");

-- CreateIndex
CREATE INDEX "patient_records_recordedAt_idx" ON "patient_records"("recordedAt");

-- CreateIndex
CREATE INDEX "dose_calculations_medication_idx" ON "dose_calculations"("medication");

-- CreateIndex
CREATE INDEX "dose_calculations_createdAt_idx" ON "dose_calculations"("createdAt");

-- CreateIndex
CREATE INDEX "device_records_deviceName_idx" ON "device_records"("deviceName");

-- CreateIndex
CREATE INDEX "device_records_readingTime_idx" ON "device_records"("readingTime");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_schedules" ADD CONSTRAINT "delivery_schedules_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_schedules" ADD CONSTRAINT "delivery_schedules_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
