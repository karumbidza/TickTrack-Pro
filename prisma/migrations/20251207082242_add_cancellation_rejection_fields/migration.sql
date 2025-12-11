/*
  Warnings:

  - The values [URGENT] on the enum `TicketPriority` will be removed. If these variants are still used in the database, this will fail.
  - The values [REPAIR,INSPECTION,INSTALLATION,OTHER] on the enum `TicketType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketPriority_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
ALTER TABLE "tickets" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "priority" TYPE "TicketPriority_new" USING ("priority"::text::"TicketPriority_new");
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
ALTER TYPE "TicketPriority_new" RENAME TO "TicketPriority";
DROP TYPE "TicketPriority_old";
ALTER TABLE "tickets" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketType_new" AS ENUM ('IT', 'SALES', 'RETAIL', 'MAINTENANCE', 'PROJECTS', 'GENERAL');
ALTER TABLE "tickets" ALTER COLUMN "type" TYPE "TicketType_new" USING ("type"::text::"TicketType_new");
ALTER TYPE "TicketType" RENAME TO "TicketType_old";
ALTER TYPE "TicketType_new" RENAME TO "TicketType";
DROP TYPE "TicketType_old";
COMMIT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationRequestedBy" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT;
