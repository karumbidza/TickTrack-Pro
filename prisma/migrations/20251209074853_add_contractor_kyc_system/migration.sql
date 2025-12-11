-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "contractor_invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contractor_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contractor_kyc" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invitationId" TEXT,
    "status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "companyName" TEXT NOT NULL,
    "tradingName" TEXT,
    "physicalAddress" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "companyPhone" TEXT NOT NULL,
    "companyProfileUrl" TEXT,
    "certificateOfIncorporationUrl" TEXT,
    "cr5RegisteredOfficeUrl" TEXT,
    "cr6DirectorsListUrl" TEXT,
    "memorandumArticlesUrl" TEXT,
    "prazCertificateUrl" TEXT,
    "directors" JSONB NOT NULL DEFAULT '[]',
    "bankName" TEXT,
    "bankBranch" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "accountCurrency" TEXT DEFAULT 'USD',
    "bankProofUrl" TEXT,
    "zimraTaxClearanceUrl" TEXT,
    "vatCertificateUrl" TEXT,
    "nssaNumber" TEXT,
    "necComplianceUrl" TEXT,
    "insuranceCoverUrl" TEXT,
    "sheqPolicyUrl" TEXT,
    "ppeComplianceDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "publicLiabilityInsuranceUrl" TEXT,
    "safetyOfficerName" TEXT,
    "safetyOfficerQualifications" TEXT,
    "safetyCertificatesUrl" TEXT,
    "numberOfEmployees" INTEGER,
    "keyTechnicalStaff" JSONB NOT NULL DEFAULT '[]',
    "availableEquipment" JSONB NOT NULL DEFAULT '[]',
    "specialLicenses" JSONB NOT NULL DEFAULT '[]',
    "methodStatementsUrl" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previousClients" JSONB NOT NULL DEFAULT '[]',
    "referenceLettersUrl" TEXT,
    "previousWorkExamplesUrl" TEXT,
    "currentProjects" JSONB NOT NULL DEFAULT '[]',
    "pastProjects" JSONB NOT NULL DEFAULT '[]',
    "industrySectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conflictOfInterestDeclared" BOOLEAN NOT NULL DEFAULT false,
    "antiCorruptionDeclared" BOOLEAN NOT NULL DEFAULT false,
    "dataPrivacyAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "infoAccuracyDeclared" BOOLEAN NOT NULL DEFAULT false,
    "authorizedSignatoryName" TEXT,
    "authorizedSignatoryPosition" TEXT,
    "signatureDate" TIMESTAMP(3),
    "companyStampUrl" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "passwordSetupToken" TEXT,
    "passwordSetupExpires" TIMESTAMP(3),
    "passwordSetAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_invitations_token_key" ON "contractor_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_invitations_tenantId_email_key" ON "contractor_invitations"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_kyc_invitationId_key" ON "contractor_kyc"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_kyc_passwordSetupToken_key" ON "contractor_kyc"("passwordSetupToken");

-- CreateIndex
CREATE UNIQUE INDEX "contractor_kyc_userId_key" ON "contractor_kyc"("userId");

-- AddForeignKey
ALTER TABLE "contractor_invitations" ADD CONSTRAINT "contractor_invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_kyc" ADD CONSTRAINT "contractor_kyc_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_kyc" ADD CONSTRAINT "contractor_kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
