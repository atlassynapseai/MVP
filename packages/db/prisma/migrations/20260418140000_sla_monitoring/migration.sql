-- CreateTable: SlaRule — per-agent or org-wide error rate threshold
CREATE TABLE "SlaRule" (
    "id" TEXT NOT NULL,
    "maxErrorRatePct" INTEGER NOT NULL,
    "windowMinutes" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlaRule_orgId_agentId_key" ON "SlaRule"("orgId", "agentId");
CREATE INDEX "SlaRule_orgId_idx" ON "SlaRule"("orgId");

ALTER TABLE "SlaRule" ADD CONSTRAINT "SlaRule_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SlaRule" ADD CONSTRAINT "SlaRule_agentId_fkey"
    FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
