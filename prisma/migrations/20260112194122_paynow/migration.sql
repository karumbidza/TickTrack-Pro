/*
  Warnings:

  - The values [BANK_TRANSFER] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('PAYNOW', 'STRIPE', 'PAYPAL');
ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "paymentProvider" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "paymentProvider" TYPE "PaymentProvider_new" USING ("paymentProvider"::text::"PaymentProvider_new");
ALTER TABLE "payments" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'PAYNOW';
ALTER TABLE "subscriptions" ALTER COLUMN "paymentProvider" SET DEFAULT 'PAYNOW';
COMMIT;
