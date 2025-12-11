/*
  Warnings:

  - The values [IT,SALES,RETAIL,PROJECTS,GENERAL] on the enum `TicketType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketType_new" AS ENUM ('REPAIR', 'MAINTENANCE', 'INSPECTION', 'INSTALLATION', 'REPLACEMENT', 'EMERGENCY', 'OTHER');
ALTER TABLE "tickets" ALTER COLUMN "type" TYPE "TicketType_new" USING ("type"::text::"TicketType_new");
ALTER TYPE "TicketType" RENAME TO "TicketType_old";
ALTER TYPE "TicketType_new" RENAME TO "TicketType";
DROP TYPE "TicketType_old";
COMMIT;

-- AlterTable
ALTER TABLE "contractors" ADD COLUMN     "secondaryPhone" TEXT;
