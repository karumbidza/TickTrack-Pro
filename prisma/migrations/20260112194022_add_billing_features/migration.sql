/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,invoiceNumber]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[activationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED_EMAIL_PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'BANK_TRANSFER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'READ_ONLY';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TenantStatus" ADD VALUE 'GRACE';
ALTER TYPE "TenantStatus" ADD VALUE 'READ_ONLY';

-- DropIndex
DROP INDEX "invoices_invoiceNumber_key";

-- DropIndex
DROP INDEX "invoices_ticketId_key";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentBatchId" TEXT,
ADD COLUMN     "previousInvoiceId" TEXT,
ADD COLUMN     "quotedAmount" DOUBLE PRECISION,
ADD COLUMN     "revisionNotes" TEXT,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "variationDescription" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bankReference" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "gracePeriodEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activationExpires" TIMESTAMP(3),
ADD COLUMN     "activationToken" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "quoteAmount" DOUBLE PRECISION,
    "quoteDescription" TEXT,
    "quoteFileUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "estimatedDays" INTEGER,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "awardedAt" TIMESTAMP(3),
    "awardedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_batches" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "popFileUrl" TEXT NOT NULL,
    "popReference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "processedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_requests_ticketId_idx" ON "quote_requests"("ticketId");

-- CreateIndex
CREATE INDEX "quote_requests_contractorId_status_idx" ON "quote_requests"("contractorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_ticketId_contractorId_key" ON "quote_requests"("ticketId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_batches_batchNumber_key" ON "payment_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "payment_batches_tenantId_idx" ON "payment_batches"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_token_key" ON "user_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_userId_key" ON "user_invitations"("userId");

-- CreateIndex
CREATE INDEX "user_invitations_token_idx" ON "user_invitations"("token");

-- CreateIndex
CREATE INDEX "user_invitations_tenantId_status_idx" ON "user_invitations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_tenantId_email_key" ON "user_invitations"("tenantId", "email");

-- CreateIndex
CREATE INDEX "invoices_paymentBatchId_idx" ON "invoices"("paymentBatchId");

-- CreateIndex
CREATE INDEX "invoices_ticketId_isActive_idx" ON "invoices"("ticketId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_tenantId_invoiceNumber_key" ON "invoices"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "payments_tenantId_status_idx" ON "payments"("tenantId", "status");

-- CreateIndex
CREATE INDEX "payments_dueDate_status_idx" ON "payments"("dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_activationToken_key" ON "users"("activationToken");

-- CreateIndex
CREATE INDEX "users_tenantId_status_idx" ON "users"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentBatchId_fkey" FOREIGN KEY ("paymentBatchId") REFERENCES "payment_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
