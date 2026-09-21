-- Sprint 2 Batch 4 correction pass: reliable "newly opened" detection for Job Alerts (S2-07).
-- Adds Position.openedAt, stamped only when a Position actually transitions into the Open
-- status (see PositionService.createPosition / updatePositionStatus). The Job Alert scheduler
-- now filters on this column instead of the unreliable `updatedAt` proximity heuristic.

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "openedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Position_status_openedAt_idx" ON "Position"("status", "openedAt");
