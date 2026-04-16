# Atlas Synapse MVP

HR for Your AI — monitor AI agents like employees.

## Prerequisites

- Node >= 20
- pnpm >= 9
- Python >= 3.12 (for Python SDK)
- Postgres (Supabase free tier or local)
- Cloudflare account (for edge worker)
- Clerk account (auth)

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy env and fill values:
   ```bash
   cp .env.example .env.local
   # edit .env.local
   ```

3. Push DB schema:
   ```bash
   pnpm --filter @atlas/db migrate
   ```

4. Generate Prisma client:
   ```bash
   pnpm --filter @atlas/db generate
   ```

## Development

Run web app (localhost:3000):
```bash
pnpm --filter @atlas/web dev
```

Run edge worker (localhost:8787):
```bash
pnpm --filter @atlas/edge dev
```

## Testing

Run all tests:
```bash
pnpm test
```

Run specific package:
```bash
pnpm --filter @atlas/shared test
```

Run Python SDK tests:
```bash
cd packages/sdk-python && PYTHONPATH=src python3 -m pytest tests/
```

## End-to-End Ingest Test

1. Start both dev servers.
2. Create a Connection row in DB with `projectTokenHash = sha256(your_test_token)` and status `active`.
3. Send test trace:
   ```bash
   curl -X POST http://localhost:8787/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "projectToken": "your_test_token",
       "agentId": "test-bot",
       "externalTraceId": "trace-001",
       "timestamp": "2026-04-16T12:00:00Z",
       "prompt": "user email test@example.com wants to book",
       "response": "Booked for tomorrow. Call 555-123-4567 to confirm."
     }'
   ```
4. Check Prisma Studio — trace row should show `[EMAIL]` and `[PHONE]` in redacted fields.

## Architecture

See `.claude/plans/` for full architecture decisions.

```
packages/
  sdk-python/          # Python SDK (atlas-synapse) — client, hooks, mapper
  evaluator/           # eval, alert, dedup, translate (@atlas/evaluator)
  db/                  # Prisma schema + client (@atlas/db)
  shared/              # HMAC, PII, Zod schemas, types (@atlas/shared)
apps/
  web/                 # Next.js 15 App Router (@atlas/web)
  edge/                # Cloudflare Worker + Hono (@atlas/edge)
scripts/
  test-anthropic-agent.py  # Anthropic agent integration smoke test
  test-n8n-scenario.md     # n8n integration scenario doc
public/
  templates/
    n8n-atlas-reporter.json  # n8n HTTP reporter workflow template
```

## CI

GitHub Actions runs on every PR: typecheck -> lint -> test -> prisma validate.
