-- Removes Sprint 2 Batch 3D Two-Factor Authentication (2FA/OTP).
-- The system returns to the Sprint 1 email + password -> JWT -> RBAC model.
-- This migration is destructive for any account that currently has 2FA
-- enabled: its encrypted TOTP secret and all backup codes are permanently
-- lost. The Access Log feature (B3-06) and Batch 4 (invitations/email) are
-- entirely unaffected — neither references any of the columns/table below.

-- DropForeignKey
ALTER TABLE "TwoFactorBackupCode" DROP CONSTRAINT IF EXISTS "TwoFactorBackupCode_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "TwoFactorBackupCode";

-- AlterTable
ALTER TABLE "User"
  DROP COLUMN IF EXISTS "twoFactorEnabled",
  DROP COLUMN IF EXISTS "twoFactorSecret",
  DROP COLUMN IF EXISTS "twoFactorTempSecret",
  DROP COLUMN IF EXISTS "twoFactorTempExpiresAt";
