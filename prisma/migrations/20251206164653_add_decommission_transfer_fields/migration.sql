-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetStatus" ADD VALUE 'DECOMMISSIONED';
ALTER TYPE "AssetStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "decommissionReason" TEXT,
ADD COLUMN     "decommissionedAt" TIMESTAMP(3),
ADD COLUMN     "transferLocation" TEXT,
ADD COLUMN     "transferReason" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3),
ADD COLUMN     "transferredTo" TEXT;
