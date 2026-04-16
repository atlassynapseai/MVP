-- P2 Schema Contracts Migration
-- Adds: TraceStatus enum values, Evaluation business fields, Incident.category, Feedback structured fields, indexes

-- 1. Extend TraceStatus enum (additive, non-breaking)
ALTER TYPE "TraceStatus" ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE "TraceStatus" ADD VALUE IF NOT EXISTS 'pass';
ALTER TYPE "TraceStatus" ADD VALUE IF NOT EXISTS 'alerted';

-- 2. Evaluation: add structured business-event fields
ALTER TABLE "Evaluation"
  ADD COLUMN IF NOT EXISTS "outcome"         TEXT,
  ADD COLUMN IF NOT EXISTS "category"        TEXT,
  ADD COLUMN IF NOT EXISTS "businessImpact"  TEXT,
  ADD COLUMN IF NOT EXISTS "technicalReason" TEXT;

-- Backfill outcome from existing pass column
UPDATE "Evaluation"
  SET "outcome" = CASE WHEN "pass" = true THEN 'pass' ELSE 'failure' END
  WHERE "outcome" IS NULL;

-- Backfill technicalReason from existing reason column
UPDATE "Evaluation"
  SET "technicalReason" = "reason"
  WHERE "technicalReason" IS NULL;

-- Make outcome NOT NULL after backfill
ALTER TABLE "Evaluation" ALTER COLUMN "outcome" SET NOT NULL;
-- technicalReason NOT NULL after backfill
ALTER TABLE "Evaluation" ALTER COLUMN "technicalReason" SET NOT NULL;

-- 3. Incident: add category field
ALTER TABLE "Incident"
  ADD COLUMN IF NOT EXISTS "category" TEXT;

-- Backfill category for existing incidents (unknown is safe default)
UPDATE "Incident"
  SET "category" = 'task_failure'
  WHERE "category" IS NULL;

ALTER TABLE "Incident" ALTER COLUMN "category" SET NOT NULL;

-- 4. Feedback: add structured correction fields
ALTER TABLE "Feedback"
  ADD COLUMN IF NOT EXISTS "correctCategory" TEXT,
  ADD COLUMN IF NOT EXISTS "correctSeverity" TEXT;

-- 5. Add indexes for cron efficiency and dedup lookup
CREATE INDEX IF NOT EXISTS "Trace_status_nextEvaluationAt_idx"
  ON "Trace" ("status", "nextEvaluationAt");

CREATE INDEX IF NOT EXISTS "Incident_dedupKey_idx"
  ON "Incident" ("dedupKey");
