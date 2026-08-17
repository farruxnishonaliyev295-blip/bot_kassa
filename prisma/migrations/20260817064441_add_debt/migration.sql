-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DEBT_PAYMENT';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "debtAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "debtId" INTEGER,
ADD COLUMN     "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Debt" (
    "id" SERIAL NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remaining" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'UNPAID',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_status_idx" ON "Debt"("status");

-- CreateIndex
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");

-- CreateIndex
CREATE INDEX "Transaction_debtId_idx" ON "Transaction"("debtId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
