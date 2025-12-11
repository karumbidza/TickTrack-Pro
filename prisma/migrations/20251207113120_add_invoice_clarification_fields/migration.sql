-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "clarificationRequest" TEXT,
ADD COLUMN     "clarificationResponse" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "workDescription" TEXT;
