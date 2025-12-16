-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_DESCRIPTION';
ALTER TYPE "TicketStatus" ADD VALUE 'AWAITING_WORK_APPROVAL';

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "workDescription" TEXT,
ADD COLUMN     "workDescriptionApproved" BOOLEAN,
ADD COLUMN     "workDescriptionApprovedAt" TIMESTAMP(3),
ADD COLUMN     "workDescriptionRejectionReason" TEXT,
ADD COLUMN     "workDescriptionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "workDescriptionSubmittedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
