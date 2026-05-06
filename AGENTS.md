# MVP — Codex Agent Context

## Project
AtlasSynapse MVP. "HR for Your AI" — monitor AI agents like employees.

## Stack
- Monorepo: pnpm + Turborepo
- Web: Next.js 16 App Router, TypeScript strict, Tailwind, Supabase auth (`@atlas/web`)
- Edge: Cloudflare Workers + Hono — ingest + PII strip (`@atlas/edge`)
- DB: Postgres/Supabase + Prisma ORM (`@atlas/db`)
- Shared: HMAC, PII utils, Zod schemas, types (`@atlas/shared`)
- Evaluator: eval, alert, dedup, translate — Anthropic + Brevo email (`@atlas/evaluator`)
- Python SDK: `packages/sdk-python/` — `atlas-synapse` Python client; Anthropic, OpenAI, AutoGen, CrewAI, LangChain, LlamaIndex
- JS SDK: `packages/sdk-js/` — `atlas-synapse` Node.js client, Vercel AI SDK support (`@atlas/sdk-js`)
- Zapier App: `zapier-app/` — Zapier integration app
- Tests: Vitest + pytest

## Commands
```bash
pnpm install
pnpm --filter @atlas/db migrate
pnpm --filter @atlas/db generate
pnpm --filter @atlas/web dev      # localhost:3000
pnpm --filter @atlas/edge dev     # localhost:8787
pnpm test

# Caliber refresh (agent config)
/opt/homebrew/bin/caliber refresh

# Save a project learning
/opt/homebrew/bin/caliber learn add "<learning>"
```

## File Map
- `README.md` — project overview
- `CLAUDE.md` — Claude Code context
- `AGENTS.md` — this file (Codex context)
- `docs/DEVELOPER_GUIDE.md` — extended developer documentation
- `docs/USER_GUIDE.md` — end-user guide
- `MVPRoadmap/ROADMAP.md` — project roadmap
- `vercel.json` — Vercel env bindings + cron schedule
- `apps/web/` — Next.js 16 web app
  - `.eslintrc.json` — ESLint config; required for `next lint` to run non-interactively in CI
  - `app/dashboard/` — dashboard pages (agents, incidents, settings, data-transparency)
    - `app/dashboard/agents/compare/` — agent comparison page
    - `app/dashboard/audit/` — audit log page
    - `app/dashboard/incidents/[id]/` — incident detail page with feedback form
    - `app/dashboard/onboarding/` — onboarding wizard
    - `app/dashboard/settings/` — `alert-pref-form.tsx`, `sla-rule-form.tsx`, `webhook-form.tsx`, `invite-form.tsx`
  - `app/api/ingest/` — ingest API route
  - `app/api/alert-prefs/` — alert preferences API route
  - `app/api/connections/` — connection CRUD (`[id]/` for individual ops)
  - `app/api/export/` — data export route
  - `app/api/feedback/` — feedback submission API route
  - `app/api/incidents/[id]/resolve/` — incident resolution
  - `app/api/invite/` — team member invite
  - `app/api/sla-rules/` — SLA rule CRUD
  - `app/api/webhooks/` — webhook handlers: Supabase, Clerk, Zapier; `[id]/` per-webhook config
  - `app/api/cron/` — Vercel Cron handlers: evaluate (daily 2am UTC), weekly-digest (Monday 9am UTC)
  - `app/login/` — Supabase auth sign-in page
  - `app/auth/callback/` — Supabase OAuth callback
  - `components/` — Sidebar, MobileSidebarWrapper, ExportButton, CountUp, AnimatedStatCard
  - `middleware.ts` — Supabase auth middleware
- `apps/edge/src/` — Hono edge worker (ingest + PII strip)
- `packages/db/` — Prisma schema + client
- `packages/shared/src/` — `hmac.ts`, `pii.ts`, `schemas.ts`, `types.ts`
- `packages/evaluator/src/` — `evaluate.ts`, `alert.ts`, `dedup.ts`, `translate.ts`, `prompts.ts`
- `packages/sdk-python/src/atlas_synapse/` — Python SDK: `client.py`, `hooks.py`, `mapper.py`, `autogen.py`, `crewai.py`, `langchain.py`, `llamaindex.py`, `openai.py`, `simple.py`
- `packages/sdk-js/src/` — JS SDK: `client.ts`, `vercel.ts`
- `packages/sdk-python/tests/` — Python SDK tests (pytest)
- `scripts/test-anthropic-agent.py` — Anthropic agent integration smoke test
- `scripts/test-n8n-scenario.md` — n8n integration scenario doc
- `scripts/seed-connection.mjs` — seed a Connection row for local ingest testing
- `scripts/slack-demo-bot/` — Slack demo bot for live Atlas Synapse presentations
- `public/templates/n8n-atlas-reporter.json` — n8n HTTP reporter workflow template
- `.claude/skills/` — `find-skills/`, `save-learning/`, `setup-caliber/`
- `.claude/rules/` — path-scoped conventions (`cron.md`, `webhooks.md`, `git-conventions.md`, `middleware.md`, `security-patterns.md`)
- `.claude/hooks/` — caliber lifecycle hooks (session, stop, notify)
- `caveman/` — caveman mode plugin (skills, rules, evals, hooks)

## Key Patterns
- Dashboard pages: `apps/web/app/dashboard/<page>/page.tsx`
- Dashboard forms: co-locate as `<page>/<form-name>-form.tsx` (e.g. `settings/alert-pref-form.tsx`)
- DB queries: `packages/db/src/index.ts` (Prisma client re-export)
- Ingest validation: `packages/shared/src/schemas.ts` (Zod)
- PII redaction: `packages/shared/src/pii.ts`
- HMAC verification: `packages/shared/src/hmac.ts`
- Shared types: `packages/shared/src/types.ts`
- Clerk webhooks: `apps/web/app/api/webhooks/clerk/route.ts` — always upsert Org before User; membership events can arrive before org.created
- Zapier webhooks: `apps/web/app/api/webhooks/zapier/route.ts` — Zapier trigger; `zapier/test/` for connection test
- Evaluator deps (`@anthropic-ai/sdk`, `@getbrevo/brevo`) in `packages/evaluator/`, not `apps/web/`; import as `@atlas/evaluator`
- Vercel Cron: `apps/web/app/api/cron/evaluate/route.ts` — batch 5, `maxDuration=60`, auth via `CRON_SECRET`
- Python SDK: Anthropic (mapper+hooks), AutoGen (`autogen.py`), CrewAI (`crewai.py`), LangChain (`langchain.py`), LlamaIndex (`llamaindex.py`), OpenAI (`openai.py`), simple (`simple.py`)
- N8N: use `public/templates/n8n-atlas-reporter.json` template; add HTTP Request reporter node to each workflow; set `tokenCount: null` (n8n exposes no native token counts)
- Auth middleware: any API route with its own auth (HMAC, bearer) must be added to `PUBLIC_PREFIXES` in `apps/web/middleware.ts`

## Conventions
- Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Branches: `feat/<slug>`, `fix/<slug>` off `main`
- PRs: explain *why* in body, link issues
- No force-push to `main`
- No `any` in TypeScript — use `unknown`

## Agent Sync
- Edit `AGENTS.md` to update Codex context
- Run `/opt/homebrew/bin/caliber refresh` after changes
- Learnings stored in `CALIBER_LEARNINGS.md`

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

If `/opt/homebrew/bin/caliber` is not found, read `.agents/skills/setup-caliber/SKILL.md` and follow its instructions to install Caliber.
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
If the pre-commit hook is not set up, read `.agents/skills/setup-caliber/SKILL.md` and follow the setup instructions.
<!-- /caliber:managed:sync -->
