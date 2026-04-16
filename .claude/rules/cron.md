---
paths:
  - apps/web/app/api/cron/**
---

# Vercel Cron Routes

## Schedule
- `vercel.json` defines cron — `/api/cron/evaluate` runs every 60s (`* * * * *`)
- Vercel injects `Authorization: Bearer <CRON_SECRET>` on every invocation

## Required Exports
- Always `export const maxDuration = 60` — default 10s timeout kills mid-eval AI chains

## Route Conventions
- Auth: check `Authorization: Bearer ${CRON_SECRET}`; return 401 if mismatch
- Batch size 5 (`BATCH_SIZE = 5`); max retry attempts 3 (`MAX_ATTEMPTS = 3`)
- Exponential backoff on failure: `min(60, 2^attempts)` minutes
- Atomic batch claim via `prisma.$transaction` — sets `status=processing` + `nextEvaluationAt` expiry lock
- Return `{ processed, passed, incidents, alerted, errors }` on success; never throw — catch and return structured error
