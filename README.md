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

2. Copy env and fill values for the web app:
   ```bash
  cp .env.example apps/web/.env.local
  # edit apps/web/.env.local
   ```

  For local dev, use these values without a `/MVP` prefix:
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
  - `WEB_INGEST_URL=http://localhost:3000/api/ingest`

3. Create edge worker local secrets:
  ```bash
  cat > apps/edge/.dev.vars <<'EOF'
  INGEST_WORKER_SECRET="replace_with_32_byte_hex_secret"
  WEB_INGEST_URL="http://localhost:3000/api/ingest"
  EOF
  ```

4. Apply DB migrations:
   ```bash
  pnpm --filter @atlas/db exec prisma migrate deploy
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

Local development runs at `http://localhost:3000` with no `/MVP` prefix. The `/MVP` base path is only enabled when `NEXT_PUBLIC_APP_URL` includes `/MVP` in production.

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
2. Sign in once at `http://localhost:3000/login`, then either create a token in the dashboard or run `node scripts/seed-connection.mjs`.
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
  web/                 # Next.js 16 App Router (@atlas/web)
  edge/                # Cloudflare Worker + Hono (@atlas/edge)
scripts/
  test-anthropic-agent.py   # Anthropic agent integration smoke test
  seed-connection.mjs        # Seed a Connection row for local testing
public/
  templates/
    n8n-atlas-reporter.json  # n8n HTTP reporter workflow template
```

The customer-facing onboarding wizard already exists at `/dashboard/onboarding` and includes Python, Node.js, n8n, Zapier, raw HTTP, and AI-assisted setup flows.

## CI

GitHub Actions runs on every push/PR: typecheck → lint → test → prisma validate.
Workflow has `permissions: contents: read` (least-privilege).

## Cron Jobs (Vercel)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/evaluate` | `0 2 * * *` (2am UTC daily) | Batch evaluate pending traces |
| `/api/cron/weekly-digest` | `0 9 * * 1` (9am UTC Mondays) | Send weekly email digest |
