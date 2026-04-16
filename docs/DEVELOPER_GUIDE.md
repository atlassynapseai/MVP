# AtlasSynapse Developer Guide

A complete reference for anyone picking up this project. Read this before touching code.

---

## What Is AtlasSynapse

AtlasSynapse is "HR for Your AI" — a monitoring platform for AI agents. Just as HR tracks employee performance, AtlasSynapse tracks what your AI agents are doing, flags problems, and alerts you when something goes wrong.

**Data flow:**

```
Your AI Agent
    ↓  (HTTP POST with projectToken)
Edge Worker (Cloudflare)
    ↓  strips PII, signs payload with HMAC
Next.js Web App (Vercel)
    ↓  verifies signature, saves to DB
Supabase (Postgres)
    ↓  cron runs every 60s
Anthropic Claude (Evaluator)
    ↓  classifies traces → creates Incidents
Dashboard
    ↓  (optional) email alert via Resend
```

---

## Stack at a Glance

| Layer | Tech | Purpose |
|-------|------|---------|
| Auth | Clerk | Login, sign-up, organizations (teams) |
| Frontend + API | Next.js 16 (App Router) on Vercel | Dashboard UI + all API routes |
| Security gateway | Cloudflare Workers + Hono | Strip PII from traces, HMAC-sign before forwarding |
| Database | Supabase (Postgres) + Prisma ORM | All persistent data: agents, traces, incidents, orgs |
| AI Evaluator | Anthropic Claude Sonnet | Read traces, classify severity + category, create Incidents |
| Email alerts | Resend | Send email when a critical incident is detected |
| Agent connectors | n8n template / Python SDK | Pre-built ways to send traces from real agents |

---

## Repo Structure

```
MVP/
├── apps/
│   ├── web/                        # Next.js 16 dashboard + API (@atlas/web)
│   │   ├── app/
│   │   │   ├── dashboard/          # All dashboard pages (overview, agents, incidents, settings)
│   │   │   ├── api/
│   │   │   │   ├── ingest/         # Receives traces from edge worker
│   │   │   │   ├── cron/evaluate/  # Evaluator cron (Vercel runs every 60s)
│   │   │   │   ├── webhooks/clerk/ # Provisions org/user rows on Clerk events
│   │   │   │   ├── feedback/       # Incident feedback submissions
│   │   │   │   └── alert-prefs/    # Alert preference CRUD
│   │   │   ├── sign-in/            # Clerk sign-in page
│   │   │   └── sign-up/            # Clerk sign-up page
│   │   └── middleware.ts           # Clerk auth — defines public routes
│   └── edge/                       # Cloudflare Worker (@atlas/edge)
│       ├── src/index.ts            # Hono app — PII strip + HMAC forward
│       ├── wrangler.toml           # Worker config
│       └── .dev.vars               # Local secrets (gitignored)
├── packages/
│   ├── db/                         # Prisma client + schema (@atlas/db)
│   │   └── prisma/
│   │       ├── schema.prisma       # Full data model
│   │       └── migrations/         # Applied migration SQL
│   ├── shared/                     # Shared utilities (@atlas/shared)
│   │   └── src/
│   │       ├── hmac.ts             # HMAC sign/verify (pure Web Crypto — works in Cloudflare)
│   │       ├── pii.ts              # PII redaction regexes
│   │       ├── schemas.ts          # Zod ingest payload schema
│   │       └── types.ts            # Shared TypeScript types
│   ├── evaluator/                  # AI evaluation engine (@atlas/evaluator)
│   │   └── src/
│   │       ├── evaluate.ts         # Anthropic call — classify trace
│   │       ├── alert.ts            # Send email alert via Resend
│   │       ├── dedup.ts            # Dedup logic (same issue = one incident)
│   │       └── translate.ts        # Business-friendly language translation
│   └── sdk-python/                 # Python SDK for agent integration
│       └── src/atlas_synapse/
│           ├── client.py           # Main client
│           ├── hooks.py            # Anthropic SDK hooks
│           └── mapper.py           # Maps Anthropic events → ingest payload
├── public/
│   └── templates/
│       └── n8n-atlas-reporter.json # n8n workflow template for trace reporting
├── scripts/
│   └── seed-connection.mjs         # Seeds a test Connection + prints curl example
├── .env.example                    # All env vars with comments
├── vercel.json                     # Cron schedule + Vercel config
└── CLAUDE.md                       # AI agent context (architecture, conventions)
```

---

## Local Dev Setup

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier works) — need two connection strings
- A [Clerk](https://clerk.com) account + app — need publishable key + secret key
- An [Anthropic](https://console.anthropic.com) API key (for incidents to generate)
- A [Resend](https://resend.com) account (optional — only needed for email alerts)
- [ngrok](https://ngrok.com) (free) — needed for Clerk webhook during local dev

### Step 1: Install dependencies

```bash
git clone https://github.com/atlassynapseai/MVP.git
cd MVP
pnpm install
```

### Step 2: Fill in environment variables

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

| Variable | Where to get it | Required |
|----------|----------------|----------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection pooling URL (port 6543) | Yes |
| `DIRECT_URL` | Supabase → Settings → Database → Direct connection URL (port 5432) | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | Yes |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` (literal) | Yes |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` (literal) | Yes |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` (literal) | Yes |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` (literal) | Yes |
| `INGEST_WORKER_SECRET` | Generate: `openssl rand -hex 32` | Yes |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Yes |
| `WEB_INGEST_URL` | `http://localhost:3000/api/ingest` | Yes |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Signing Secret (set up in Step 5) | Yes |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Yes (for incidents) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | No (email alerts only) |
| `RESEND_FROM_EMAIL` | Your verified Resend sender | No |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Yes |

Also create `apps/edge/.dev.vars` (edge worker local secrets):

```bash
cat > apps/edge/.dev.vars << EOF
INGEST_WORKER_SECRET="<same value as above>"
WEB_INGEST_URL="http://localhost:3000/api/ingest"
EOF
```

### Step 3: Run database migrations

```bash
pnpm --filter @atlas/db exec prisma migrate deploy
pnpm --filter @atlas/db generate
```

This applies all migrations in `packages/db/prisma/migrations/` to your Supabase database and regenerates the Prisma client.

### Step 4: Start dev servers

**Terminal 1 — Next.js web app:**
```bash
pnpm --filter @atlas/web dev
# → http://localhost:3000
```

**Terminal 2 — Cloudflare edge worker:**
```bash
pnpm --filter @atlas/edge dev
# → check output for port, e.g. "Ready on http://localhost:8787"
# Note: port may vary if 8787 is taken — always check terminal output
```

### Step 5: Set up Clerk webhook (required for org provisioning)

The dashboard shows "Setting up your organization…" until the DB has a matching org row. This row is created automatically when Clerk fires a webhook on org creation. You need ngrok to expose localhost to Clerk.

```bash
ngrok http 3000
# → copy the https://xxxx.ngrok.io URL
```

In Clerk Dashboard → Webhooks → Add endpoint:
- URL: `https://xxxx.ngrok.io/api/webhooks/clerk`
- Subscribe to: `organization.created`, `organizationMembership.created`
- Copy the Signing Secret → paste into `CLERK_WEBHOOK_SECRET` in `apps/web/.env.local`
- Restart Next.js after updating `.env.local`

### Step 6: Sign in and verify

1. Go to `http://localhost:3000`
2. Sign up with Clerk
3. Create an organization (Clerk UI)
4. Go to `http://localhost:3000/dashboard` — should show "Your AI Workforce" (empty)

### Step 7: Send a test trace

```bash
curl -X POST http://localhost:<edge-port>/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "projectToken": "atlas-test-token-32chars-xxxxxxxx",
    "agentId": "test-agent",
    "externalTraceId": "trace-001",
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'",
    "prompt": "Book a flight from London to New York",
    "response": "I was unable to complete the booking due to an error.",
    "toolCalls": [{"name": "search_flights", "input": {"from": "LHR", "to": "JFK"}, "output": null}],
    "platform": "n8n"
  }'
```

> **Note:** You must seed a Connection first so the token is recognised. Run `node scripts/seed-connection.mjs` — it creates a Connection row in your DB and prints the curl command above.

Refresh the dashboard → agent card appears. Wait 60s → cron evaluates the trace → incident appears in `/dashboard/incidents` (requires `ANTHROPIC_API_KEY`).

---

## Connecting Real Agents

### Option 1: n8n

1. In n8n, go to Settings → Import Workflow
2. Import `public/templates/n8n-atlas-reporter.json`
3. In the HTTP Request node, set:
   - URL: your edge worker URL (local: `http://localhost:<port>/ingest`, production: Cloudflare Workers URL)
   - `projectToken`: your Connection's project token (from `scripts/seed-connection.mjs` or DB)
4. Connect the reporter node at the end of your workflow

### Option 2: Python SDK

```bash
pip install atlas-synapse
```

```python
from atlas_synapse import AtlasSynapseClient
import anthropic

atlas = AtlasSynapseClient(
    ingest_url="https://atlas-edge.<account>.workers.dev/ingest",
    project_token="your-project-token",
)

client = atlas.wrap(anthropic.Anthropic())
# Use `client` exactly like the normal Anthropic client — traces sent automatically
```

### Option 3: Raw HTTP

POST to the edge worker URL with this payload:

```json
{
  "projectToken": "your-project-token",
  "agentId": "my-agent",
  "externalTraceId": "unique-trace-id",
  "timestamp": "2026-04-16T12:00:00Z",
  "prompt": "User message here",
  "response": "Agent response here",
  "toolCalls": [
    { "name": "tool_name", "input": { "key": "value" }, "output": "result or null" }
  ],
  "platform": "anthropic",
  "tokenCount": 1234,
  "costCents": 5
}
```

Schema defined in `packages/shared/src/schemas.ts`.

---

## How Incidents Are Generated

1. **Cron fires** every 60 seconds (`/api/cron/evaluate` — scheduled in `vercel.json`)
2. **Fetches** up to 5 unevaluated traces from DB
3. **Sends each** to Anthropic Claude Sonnet with a classification prompt
4. **Claude returns** severity (`warning`/`critical`) + category (e.g. `task_failure`, `policy_violation`)
5. **Dedup check** — if same issue already has an open incident, skips
6. **Creates Incident row** in DB
7. **Sends email alert** via Resend if severity is `critical` (requires `RESEND_API_KEY`)
8. Dashboard shows incidents under `/dashboard/incidents`

**Requires:** `ANTHROPIC_API_KEY` in env. Without it, cron runs but produces no incidents.

---

## Deploy to Production

### Vercel (web app)

1. Go to [vercel.com](https://vercel.com) → Add New Project → Import from GitHub → `atlassynapseai/MVP`
2. Framework: Next.js (auto-detected)
3. Root directory: `apps/web`
4. Add all env vars from the table above (use production values — Supabase pooler URL, real secrets)
5. Click Deploy → copy the Vercel URL (e.g. `https://mvp-abc.vercel.app`)

After deploy:
- Go to Clerk Dashboard → Webhooks → update endpoint URL to `https://<vercel-url>/api/webhooks/clerk`
- Vercel → Functions → Cron Jobs → verify `/api/cron/evaluate` is scheduled

### Cloudflare Workers (edge worker)

```bash
cd apps/edge
wrangler secret put INGEST_WORKER_SECRET   # same value as Vercel env var
wrangler secret put WEB_INGEST_URL         # https://<vercel-url>/api/ingest
wrangler deploy
# → gives you: https://atlas-synapse-edge.<account>.workers.dev
```

Use the Cloudflare Workers URL as `ATLAS_INGEST_URL` in n8n or Python SDK.

---

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Setting up your organization…" on dashboard | Clerk webhook didn't fire — no org row in DB | Re-trigger: delete and recreate org in Clerk, or run `node scripts/seed-connection.mjs` and manually insert org row |
| Incidents not appearing after sending traces | Missing or placeholder `ANTHROPIC_API_KEY` | Add real key to `.env.local`, restart Next.js |
| Edge worker port is not 8787 | Wrangler dev picks next available port | Check terminal output for "Ready on http://localhost:XXXX" and use that port |
| Edge returns `Internal Server Error` | `WEB_INGEST_URL` pointing to wrong port | Check which port Next.js started on and update `apps/edge/.dev.vars` |
| `Buffer is not defined` in edge worker | Node.js built-in unavailable in Cloudflare Workers runtime | Fixed — `packages/shared/src/hmac.ts` uses pure Web Crypto API |
| `Unknown field 'category'` Prisma error | Stale Prisma client (generated before P2 migration) | Run `pnpm --filter @atlas/db generate` then restart Next.js |
| `next lint` fails in CI with path error | Next.js 16 CLI change — positional arg is now dir | Fixed — lint script uses `next lint --dir .` |

---

## Key Conventions

- **No `any` in TypeScript** — use `unknown`
- **Commits**: conventional commits — `feat:`, `fix:`, `docs:`, `chore:`
- **Branches**: `feat/<slug>` or `fix/<slug>` off `main`
- **Public API routes** (HMAC/Svix/bearer auth) must be listed in `isPublicRoute` in `apps/web/middleware.ts`
- **Prisma compound unique with nullable field** — use `findFirst` not `findUnique` (Prisma rejects null in `where` for unique queries)
- **Evaluator deps** (`@anthropic-ai/sdk`, `resend`) live in `packages/evaluator/` — do not add them to `apps/web/`
- **HMAC**: `packages/shared/src/hmac.ts` uses pure Web Crypto (no Node.js built-ins) so it runs in both Cloudflare Workers and Node.js
