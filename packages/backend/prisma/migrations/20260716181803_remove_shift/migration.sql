/*
  Warnings:

  - You are about to drop the column `shiftId` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the `shifts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_shiftId_fkey";

-- DropForeignKey
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_userId_fkey";

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "shiftId";

-- DropTable
DROP TABLE "shifts";

-- DropEnum
DROP TYPE "ShiftStatus";
