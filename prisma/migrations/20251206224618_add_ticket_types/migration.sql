/*
  Warnings:

  - The values [ASSIGNED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `customerServiceRating` to the `ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overallRating` to the `ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `punctualityRating` to the `ratings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workmanshipRating` to the `ratings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "TicketPriority" ADD VALUE 'URGENT';

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'PROCESSING', 'ACCEPTED', 'IN_PROGRESS', 'ON_SITE', 'AWAITING_APPROVAL', 'COMPLETED', 'CLOSED', 'CANCELLED');
ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TABLE "status_history" ALTER COLUMN "fromStatus" TYPE "TicketStatus_new" USING ("fromStatus"::text::"TicketStatus_new");
ALTER TABLE "status_history" ALTER COLUMN "toStatus" TYPE "TicketStatus_new" USING ("toStatus"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketType" ADD VALUE 'REPAIR';
ALTER TYPE "TicketType" ADD VALUE 'INSPECTION';
ALTER TYPE "TicketType" ADD VALUE 'INSTALLATION';
ALTER TYPE "TicketType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "ratings" ADD COLUMN     "contractorId" TEXT,
ADD COLUMN     "customerServiceRating" INTEGER NOT NULL,
ADD COLUMN     "followedSiteProcedures" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overallRating" INTEGER NOT NULL,
ADD COLUMN     "ppeCompliant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "punctualityRating" INTEGER NOT NULL,
ADD COLUMN     "ratingDetails" JSONB DEFAULT '{}',
ADD COLUMN     "workmanshipRating" INTEGER NOT NULL,
ALTER COLUMN "rating" DROP NOT NULL,
ALTER COLUMN "category" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "scheduledArrival" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
