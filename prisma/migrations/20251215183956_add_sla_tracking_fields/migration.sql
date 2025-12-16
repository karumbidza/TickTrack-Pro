-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "contractorAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "onSiteAt" TIMESTAMP(3),
ADD COLUMN     "resolutionDeadline" TIMESTAMP(3),
ADD COLUMN     "responseDeadline" TIMESTAMP(3);
