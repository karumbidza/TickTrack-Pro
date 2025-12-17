-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "branchId" TEXT,
ALTER COLUMN "location" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
