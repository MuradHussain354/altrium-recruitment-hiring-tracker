-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('ApplicationConfirmation', 'InterviewScheduled', 'InterviewRescheduled', 'InterviewCancelled', 'ApplicationRejected', 'ApplicationHired', 'AccountInvitation', 'JobAlert', 'HiringReportDigest');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('Pending', 'Sending', 'Sent', 'Failed');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "invitationTokenHash" TEXT,
ADD COLUMN "invitationExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'Pending',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applicationId" TEXT,
    "interviewId" TEXT,
    "userId" TEXT,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_invitationTokenHash_key" ON "User"("invitationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDeliveryLog_idempotencyKey_key" ON "EmailDeliveryLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_status_nextAttemptAt_idx" ON "EmailDeliveryLog"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_eventType_idx" ON "EmailDeliveryLog"("eventType");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_recipient_idx" ON "EmailDeliveryLog"("recipient");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_createdAt_idx" ON "EmailDeliveryLog"("createdAt");
