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
- **Python SDK**: `packages/sdk-python/` — `atlas-synapse` Python client with hooks, mapper, Anthropic agent support
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
- **Web app**: `apps/web/` — Next.js 15 App Router (`@atlas/web`)
  - `apps/web/app/dashboard/` — dashboard pages
    - `page.tsx` — overview with stats + activity feed
    - `agents/page.tsx` — agent list; `agents/[id]/page.tsx` — agent detail
    - `traces/page.tsx` — trace list; `traces/[id]/page.tsx` — trace detail
    - `evaluations/page.tsx` — evaluation list with filters
    - `incidents/page.tsx` — incident list; `incidents/[id]/page.tsx` — incident detail + feedback
    - `connections/page.tsx` — project token management
    - `settings/page.tsx` — alert prefs + alert history
    - `data-transparency/page.tsx` — PII policy
  - `apps/web/app/api/ingest/` — ingest API route
  - `apps/web/app/api/evaluate/` — on-demand evaluation route
  - `apps/web/app/api/activity/` — recent activity feed route
  - `apps/web/app/api/alert-prefs/` — alert preferences API route
  - `apps/web/app/api/feedback/` — feedback submission API route
  - `apps/web/app/api/webhooks/` — Supabase webhook handler
  - `apps/web/app/api/cron/` — Vercel Cron handler (evaluate, every 60s)
  - `apps/web/components/` — Sidebar, MobileSidebarWrapper
  - `apps/web/middleware.ts` — Supabase auth middleware
- **Edge worker**: `apps/edge/src/` — Hono ingest handler + PII strip (`@atlas/edge`)
- **Database**: `packages/db/` — Prisma schema + client re-export (`@atlas/db`)
- **Shared**: `packages/shared/src/` — `hmac.ts`, `pii.ts`, `schemas.ts`, `types.ts` (`@atlas/shared`)
- **Evaluator**: `packages/evaluator/src/` — `evaluate.ts`, `alert.ts`, `dedup.ts`, `translate.ts`, `prompts.ts` (`@atlas/evaluator`)
- **Python SDK**: `packages/sdk-python/src/atlas_synapse/` — `client.py`, `hooks.py`, `mapper.py`
- **Scripts**: `scripts/test-anthropic-agent.py`, `scripts/seed-connection.mjs`
- **N8N template**: `public/templates/n8n-atlas-reporter.json`
- **Deployment**: `vercel.json` — cron schedule (`* * * * *` → `/api/cron/evaluate`)

## Key Patterns
- Add dashboard pages: `apps/web/app/dashboard/<page>/page.tsx`
- Dashboard forms: co-locate as `<page>/<form-name>-form.tsx`
- DB queries via `packages/db/src/index.ts` (Prisma client re-export)
- Ingest payload validation: `packages/shared/src/schemas.ts` (Zod)
- PII redaction: `packages/shared/src/pii.ts`
- HMAC token verification: `packages/shared/src/hmac.ts`
- Shared types: `packages/shared/src/types.ts`
- Edge routes in `apps/edge/src/index.ts` (Hono)
- Evaluator deps (`@anthropic-ai/sdk`, `resend`) in `packages/evaluator/`, not `apps/web/`; import as `@atlas/evaluator`
- Vercel Cron: `apps/web/app/api/cron/evaluate/route.ts` — batch 5, `maxDuration=60`, auth via `CRON_SECRET`
- Client-side `fetch()` calls: use `\`${basePath}/api/...\`` — Next.js does NOT auto-prepend basePath to raw fetch. `<Link href>` and `router.push()` use plain `/path` (Next.js auto-prepends). Server-side `redirect()` uses full `${appUrl}/path`.
- Python SDK: mapper transforms Anthropic SDK events → AtlasSynapse ingest payload
- N8N: import `public/templates/n8n-atlas-reporter.json`; set `tokenCount: null` (n8n has no native token count)
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
