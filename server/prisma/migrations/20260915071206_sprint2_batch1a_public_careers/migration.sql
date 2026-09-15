-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "linkedInUrl" TEXT;

-- CreateTable
CREATE TABLE "JobAlertSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT,
    "keyword" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAlertSubscription_unsubscribeToken_key" ON "JobAlertSubscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "JobAlertSubscription_email_idx" ON "JobAlertSubscription"("email");

-- CreateIndex
CREATE INDEX "JobAlertSubscription_isActive_idx" ON "JobAlertSubscription"("isActive");
