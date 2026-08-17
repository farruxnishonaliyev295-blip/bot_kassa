/*
  Warnings:

  - The values [DEBT_PAYMENT] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `remaining` on the `Debt` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Debt` table. All the data in the column will be lost.
  - You are about to drop the column `debtAmount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `debtAmount` to the `Debt` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('INCOME', 'EXPENSE');
ALTER TABLE "Transaction" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropIndex
DROP INDEX "Debt_status_idx";

-- AlterTable
ALTER TABLE "Debt" DROP COLUMN "remaining",
DROP COLUMN "status",
ADD COLUMN     "debtAmount" DECIMAL(15,2) NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "debtAmount",
DROP COLUMN "paidAmount";

-- DropEnum
DROP TYPE "DebtStatus";

-- CreateIndex
CREATE INDEX "Debt_createdAt_idx" ON "Debt"("createdAt");
