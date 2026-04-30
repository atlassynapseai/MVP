# Atlas Synapse MVP

HR for Your AI — monitor AI agents like employees.

## Prerequisites

- Node >= 20
- pnpm >= 9
- Python >= 3.10 (for Python SDK)
- Postgres (Supabase free tier or local)
- Cloudflare account (for edge worker)
- Supabase account (auth + database)

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
NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @atlas/web dev
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

See `docs/DEVELOPER_GUIDE.md` for extended documentation and `docs/USER_GUIDE.md` for end-user guide.

```
zapier-app/              # Zapier integration app
packages/
  sdk-python/          # Python SDK — client, hooks, mapper; Anthropic, OpenAI, AutoGen, CrewAI, LangChain, LlamaIndex
  sdk-js/              # JS/TS SDK (atlas-synapse) — Node.js, Vercel AI SDK support
  evaluator/           # eval, alert, dedup, translate (@atlas/evaluator)
  db/                  # Prisma schema + client (@atlas/db)
  shared/              # HMAC, PII, Zod schemas, types (@atlas/shared)
apps/
  web/                 # Next.js 15 App Router (@atlas/web)
  edge/                # Cloudflare Worker + Hono (@atlas/edge)
scripts/
  test-anthropic-agent.py   # Anthropic agent integration smoke test
  seed-connection.mjs        # Seed a Connection row for local testing
public/
  templates/
    n8n-atlas-reporter.json  # n8n HTTP reporter workflow template
```

## CI

GitHub Actions runs on every push/PR: typecheck → lint → test → prisma validate.
Workflow has `permissions: contents: read` (least-privilege).

## Cron Jobs (Vercel)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/evaluate` | `0 2 * * *` (2am UTC daily) | Batch evaluate pending traces |
| `/api/cron/weekly-digest` | `0 9 * * 1` (9am UTC Mondays) | Send weekly email digest |
