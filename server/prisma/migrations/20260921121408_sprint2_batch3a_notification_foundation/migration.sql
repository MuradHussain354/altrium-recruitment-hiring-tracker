-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'InApp';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CommentMention';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "interviewId" TEXT,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_idx" ON "Notification"("recipientId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_interviewId_recipientId_type_idx" ON "Notification"("interviewId", "recipientId", "type");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
