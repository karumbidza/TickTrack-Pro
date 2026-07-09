-- Reports & Analytics: maintenance budget + SLA / resolution tracking fields

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "maintenanceBudget" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "slaFirstResponseBreached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slaResolutionBreached" BOOLEAN NOT NULL DEFAULT false;
