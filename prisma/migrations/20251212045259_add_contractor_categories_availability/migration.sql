-- CreateTable
CREATE TABLE "contractor_categories" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_categories_contractorId_categoryId_key" ON "contractor_categories"("contractorId", "categoryId");

-- AddForeignKey
ALTER TABLE "contractor_categories" ADD CONSTRAINT "contractor_categories_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "contractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_categories" ADD CONSTRAINT "contractor_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
