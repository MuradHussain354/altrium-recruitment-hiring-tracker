-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing applications
UPDATE "Application" SET "stageEnteredAt" = "createdAt";
