/*
  Warnings:

  - You are about to drop the column `costCents` on the `Trace` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orgId,agentId]` on the table `AlertPref` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[agentId,externalTraceId]` on the table `Trace` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "AlertPref" DROP CONSTRAINT "AlertPref_orgId_fkey";

-- DropForeignKey
ALTER TABLE "Evaluation" DROP CONSTRAINT "Evaluation_traceId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_userId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_agentId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_orgId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_traceId_fkey";

-- DropForeignKey
ALTER TABLE "Trace" DROP CONSTRAINT "Trace_agentId_fkey";

-- DropForeignKey
ALTER TABLE "Trace" DROP CONSTRAINT "Trace_orgId_fkey";

-- AlterTable
ALTER TABLE "Trace" DROP COLUMN "costCents",
ADD COLUMN     "costMicroUsd" INTEGER,
ADD COLUMN     "evaluationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextEvaluationAt" TIMESTAMP(3),
ADD COLUMN     "redactionVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "AlertPref_orgId_agentId_key" ON "AlertPref"("orgId", "agentId");

-- CreateIndex
CREATE INDEX "Connection_orgId_idx" ON "Connection"("orgId");

-- CreateIndex
CREATE INDEX "Incident_orgId_createdAt_idx" ON "Incident"("orgId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Trace_agentId_externalTraceId_key" ON "Trace"("agentId", "externalTraceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertPref" ADD CONSTRAINT "AlertPref_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
