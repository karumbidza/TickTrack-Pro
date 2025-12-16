-- AlterTable
ALTER TABLE "contractor_kyc" ADD COLUMN     "serviceCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
