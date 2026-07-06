-- Public "request a quote" leads are no longer forced to create a placeholder
-- Tenant. Make quotes.tenantId nullable.
ALTER TABLE "quotes" ALTER COLUMN "tenantId" DROP NOT NULL;
