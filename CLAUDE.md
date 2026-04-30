# MVP — Claude Code Context

## Project
AtlasSynapse MVP. "HR for Your AI" — monitor AI agents like employees.

## Stack
- **Monorepo**: pnpm + Turborepo
- **Web**: Next.js 15 App Router, TypeScript strict, Tailwind + lucide-icons, Supabase auth (`@atlas/web`)
- **Edge**: Cloudflare Workers + Hono — ingest + PII strip (`@atlas/edge`)
- **DB**: Postgres/Supabase + Prisma ORM (`@atlas/db`)
- **Shared**: HMAC, PII utils, Zod schemas, types (`@atlas/shared`)
- **AI**: Anthropic Claude Sonnet 4.5 (eval + translate)
- **Evaluator**: `packages/evaluator/` — eval, alert, dedup, translate (`@atlas/evaluator`)
- **Python SDK**: `packages/sdk-python/` — `atlas-synapse` Python client; supports Anthropic, OpenAI, AutoGen, CrewAI, LangChain, LlamaIndex
- **JS SDK**: `packages/sdk-js/` — `atlas-synapse` Node.js client with Vercel AI SDK support (`@atlas/sdk-js`)
- **Zapier App**: `zapier-app/` — Zapier integration app
- **Testing**: Vitest + pytest
- **Hosting**: Vercel (web), Cloudflare (worker), Supabase (db)

## Setup
```bash
pnpm install
cp .env.example .env.local  # fill values

# DB
pnpm --filter @atlas/db migrate
pnpm --filter @atlas/db generate

# Dev servers
pnpm --filter @atlas/web dev      # localhost:3000
pnpm --filter @atlas/edge dev     # localhost:8787

# Test
pnpm test
```

## Architecture
- **Root**: `README.md` — project overview
- **Roadmap**: `MVPRoadmap/ROADMAP.md` — project roadmap
- **Developer docs**: `docs/DEVELOPER_GUIDE.md` — extended developer documentation
- **User docs**: `docs/USER_GUIDE.md` — end-user guide
- **Web app**: `apps/web/` — Next.js 15 App Router (`@atlas/web`)
  - `apps/web/app/dashboard/` — dashboard pages
    - `page.tsx` — overview with stats + activity feed
    - `agents/page.tsx` — agent list; `agents/[id]/page.tsx` — agent detail; `agents/compare/page.tsx` — agent comparison
    - `traces/page.tsx` — trace list; `traces/[id]/page.tsx` — trace detail
    - `evaluations/page.tsx` — evaluation list with filters
    - `incidents/page.tsx` — incident list; `incidents/[id]/page.tsx` — incident detail + feedback
    - `connections/page.tsx` — project token management
    - `settings/page.tsx` — alert prefs, SLA rules, webhooks, team invites
    - `data-transparency/page.tsx` — PII policy
    - `audit/page.tsx` — audit log
    - `onboarding/page.tsx` — onboarding wizard
  - `apps/web/app/api/ingest/` — ingest API route
  - `apps/web/app/api/evaluate/` — on-demand evaluation route
  - `apps/web/app/api/activity/` — recent activity feed route
  - `apps/web/app/api/alert-prefs/` — alert preferences API route
  - `apps/web/app/api/feedback/` — feedback submission API route
  - `apps/web/app/api/connections/` — connection CRUD; `[id]/` for individual ops
  - `apps/web/app/api/export/` — data export route
  - `apps/web/app/api/incidents/[id]/resolve/` — incident resolution
  - `apps/web/app/api/invite/` — team member invite
  - `apps/web/app/api/sla-rules/` — SLA rule CRUD
  - `apps/web/app/api/webhooks/` — webhook handlers: Supabase, Clerk, Zapier; `[id]/` per-webhook config
  - `apps/web/app/api/cron/` — Vercel Cron handlers: evaluate (daily 2am UTC), weekly-digest (Monday 9am UTC)
  - `apps/web/components/` — Sidebar, MobileSidebarWrapper, ExportButton, CountUp, AnimatedStatCard
  - `apps/web/middleware.ts` — Supabase auth middleware
- **Edge worker**: `apps/edge/src/` — Hono ingest handler + PII strip (`@atlas/edge`)
- **Database**: `packages/db/` — Prisma schema + client re-export (`@atlas/db`)
- **Shared**: `packages/shared/src/` — `hmac.ts`, `pii.ts`, `schemas.ts`, `types.ts` (`@atlas/shared`)
- **Evaluator**: `packages/evaluator/src/` — `evaluate.ts`, `alert.ts`, `dedup.ts`, `translate.ts`, `prompts.ts` (`@atlas/evaluator`)
- **Python SDK**: `packages/sdk-python/src/atlas_synapse/` — `client.py`, `hooks.py`, `mapper.py`, `autogen.py`, `crewai.py`, `langchain.py`, `llamaindex.py`, `openai.py`, `simple.py`
- **JS SDK**: `packages/sdk-js/src/` — `client.ts`, `vercel.ts` (Vercel AI SDK wrapper)
- **Scripts**: `scripts/test-anthropic-agent.py`, `scripts/seed-connection.mjs`
- **N8N template**: `public/templates/n8n-atlas-reporter.json`
- **Deployment**: `vercel.json` — cron schedules (`0 2 * * *` → `/api/cron/evaluate`; `0 9 * * 1` → `/api/cron/weekly-digest`)

## Key Patterns
- Add dashboard pages: `apps/web/app/dashboard/<page>/page.tsx`
- Dashboard forms: co-locate as `<page>/<form-name>-form.tsx`
- DB queries via `packages/db/src/index.ts` (Prisma client re-export)
- Ingest payload validation: `packages/shared/src/schemas.ts` (Zod)
- PII redaction: `packages/shared/src/pii.ts`
- HMAC token verification: `packages/shared/src/hmac.ts`
- Shared types: `packages/shared/src/types.ts`
- Edge routes in `apps/edge/src/index.ts` (Hono)
- Evaluator deps (`@anthropic-ai/sdk`, `@getbrevo/brevo`) in `packages/evaluator/`, not `apps/web/`; import as `@atlas/evaluator`
- Vercel Cron: `apps/web/app/api/cron/evaluate/route.ts` — batch 5, `maxDuration=60`, auth via `CRON_SECRET`
- Client-side `fetch()` calls: use `` `${basePath}/api/...` `` — Next.js does NOT auto-prepend basePath to raw fetch. `<Link href>` and `router.push()` use plain `/path` (Next.js auto-prepends). Server-side `redirect()` uses full `${appUrl}/path`.
- Python SDK: supports Anthropic (mapper+hooks), AutoGen (`autogen.py`), CrewAI (`crewai.py`), LangChain (`langchain.py`), LlamaIndex (`llamaindex.py`), OpenAI (`openai.py`), simple wrapper (`simple.py`)
- N8N: import `public/templates/n8n-atlas-reporter.json`; omit `tokenCount` (n8n has no native token count)
- Platform field: `z.string().max(64).optional()` — open string, not enum; any value accepted
- Outbound webhooks: `deliverWebhook` must be awaited (not fire-and-forget) in serverless — Vercel kills function before HTTP completes
- SLA monitoring: `checkSlaRules` in cron — counts `Evaluation.outcome` in rolling window; min 5 evals required; deduped hourly
- Data isolation: ALL DB queries scoped to `orgId` from authenticated session — no cross-org leakage possible
- Auth middleware: API routes with their own auth (HMAC, bearer) must be in public routes list in `apps/web/middleware.ts`

## Conventions
- Commits: conventional commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Branches: feature branches off `main`; name as `feat/<short-slug>` or `fix/<short-slug>`
- No `any` in TypeScript — use `unknown`
- Prefer explicit over implicit — name things clearly
- `NODE_OPTIONS=--max-old-space-size=4096` for all node/build commands

## Claude Responsibilities
- Architecture decisions + tech stack choices
- PR review + merge approval
- CLAUDE.md updates
- Escalation handling

## Codex Responsibilities
- Scoped feature implementation (bounded by task spec)
- File edits within defined scope
- Tests for implemented features
- Never pushes to `main` — always feature branch

<!-- caliber:managed:pre-commit -->
## Before Committing

**IMPORTANT:** Before every git commit, you MUST ensure Caliber syncs agent configs with the latest code changes.

First, check if the pre-commit hook is already installed:
```bash
grep -q "caliber" .git/hooks/pre-commit 2>/dev/null && echo "hook-active" || echo "no-hook"
```

- If **hook-active**: the hook handles sync automatically — just commit normally. Tell the user: "Caliber will sync your agent configs automatically via the pre-commit hook."
- If **no-hook**: run Caliber manually before committing:
  1. Tell the user: "Caliber: Syncing agent configs with your latest changes..."
  2. Run: `/opt/homebrew/bin/caliber refresh && git add CLAUDE.md .claude/ .cursor/ .cursorrules .github/copilot-instructions.md .github/instructions/ AGENTS.md CALIBER_LEARNINGS.md .agents/ .opencode/ 2>/dev/null`
  3. After it completes, briefly tell the user what Caliber updated. Then proceed with the commit.

If `/opt/homebrew/bin/caliber` is not found, tell the user: "This project uses Caliber for agent config sync. Run /setup-caliber to get set up."
<!-- /caliber:managed:pre-commit -->

<!-- caliber:managed:learnings -->
## Session Learnings

Read `CALIBER_LEARNINGS.md` for patterns and anti-patterns learned from previous sessions.
These are auto-extracted from real tool usage — treat them as project-specific rules.
<!-- /caliber:managed:learnings -->

<!-- caliber:managed:sync -->
## Context Sync

This project uses [Caliber](https://github.com/caliber-ai-org/ai-setup) to keep AI agent configs in sync across Claude Code, Cursor, Copilot, and Codex.
Configs update automatically before each commit via `/opt/homebrew/bin/caliber refresh`.
If the pre-commit hook is not set up, run `/setup-caliber` to configure everything automatically.
<!-- /caliber:managed:sync -->
