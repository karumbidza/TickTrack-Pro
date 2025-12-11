-- AlterEnum
ALTER TYPE "AssetStatus" ADD VALUE 'PENDING_DECOMMISSION';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "decommissionApprovedAt" TIMESTAMP(3),
ADD COLUMN     "decommissionApprovedById" TEXT,
ADD COLUMN     "decommissionRejectedAt" TIMESTAMP(3),
ADD COLUMN     "decommissionRejectedById" TEXT,
ADD COLUMN     "decommissionRejectionReason" TEXT,
ADD COLUMN     "decommissionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "decommissionRequestedById" TEXT,
ADD COLUMN     "endOfLifeDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "maintenance_history" ADD COLUMN     "contractorId" TEXT;

-- CreateTable
CREATE TABLE "asset_history" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "description" TEXT NOT NULL,
    "performedById" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_decommissionRequestedById_fkey" FOREIGN KEY ("decommissionRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_decommissionApprovedById_fkey" FOREIGN KEY ("decommissionApprovedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_decommissionRejectedById_fkey" FOREIGN KEY ("decommissionRejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_history" ADD CONSTRAINT "maintenance_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
