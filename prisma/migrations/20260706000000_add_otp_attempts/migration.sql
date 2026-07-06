-- Add failed-attempt counter for password-reset OTP lockout.
-- Existing rows default to 0. OTP values are now stored as SHA-256 hashes.
ALTER TABLE "password_reset_tokens" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
