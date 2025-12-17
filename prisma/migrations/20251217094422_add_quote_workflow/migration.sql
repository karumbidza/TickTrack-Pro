-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_QUOTE';
ALTER TYPE "TicketStatus" ADD VALUE 'QUOTE_SUBMITTED';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "quoteAmount" DOUBLE PRECISION,
ADD COLUMN     "quoteApproved" BOOLEAN,
ADD COLUMN     "quoteApprovedAt" TIMESTAMP(3),
ADD COLUMN     "quoteDescription" TEXT,
ADD COLUMN     "quoteFileUrl" TEXT,
ADD COLUMN     "quoteRejectionReason" TEXT,
ADD COLUMN     "quoteRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quoteRequestedAt" TIMESTAMP(3),
ADD COLUMN     "quoteSubmittedAt" TIMESTAMP(3);
