# MVP — Codex Agent Context

## Project
AtlasSynapse MVP. "HR for Your AI" — monitor AI agents like employees.

## Stack
- Monorepo: pnpm + Turborepo
- Web: Next.js 15 App Router, TypeScript strict, Tailwind, Clerk auth (`@atlas/web`)
- Edge: Cloudflare Workers + Hono — ingest + PII strip (`@atlas/edge`)
- DB: Postgres/Supabase + Prisma ORM (`@atlas/db`)
- Shared: HMAC, PII utils, Zod schemas, types (`@atlas/shared`)
- Evaluator: eval, alert, dedup, translate — Anthropic + Resend (`@atlas/evaluator`)
- Python SDK: `packages/sdk-python/` — `atlas-synapse` Python client (`@atlas/sdk-python`)
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
- `vercel.json` — Vercel env bindings + cron schedule
- `apps/web/` — Next.js 15 web app
  - `.eslintrc.json` — ESLint config; required for `next lint` to run non-interactively in CI
  - `app/dashboard/` — dashboard pages (agents, incidents, settings, data-transparency)
    - `app/dashboard/incidents/[id]/` — incident detail page with feedback form
    - `app/dashboard/settings/` — alert preference form (`alert-pref-form.tsx`)
  - `app/api/ingest/` — ingest API route
  - `app/api/alert-prefs/` — alert preferences API route
  - `app/api/feedback/` — feedback submission API route
  - `app/api/webhooks/` — Clerk webhook handler
  - `app/api/cron/` — Vercel Cron evaluate route (every 60s)
  - `app/sign-in/` — Clerk sign-in page
  - `app/sign-up/` — Clerk sign-up page
  - `components/` — shared UI components
  - `middleware.ts` — Clerk auth middleware
- `apps/edge/src/` — Hono edge worker (ingest + PII strip)
- `packages/db/` — Prisma schema + client
- `packages/shared/src/` — `hmac.ts`, `pii.ts`, `schemas.ts`, `types.ts`
- `packages/evaluator/src/` — `evaluate.ts`, `alert.ts`, `dedup.ts`, `translate.ts`, `prompts.ts`
- `packages/sdk-python/src/atlas_synapse/` — Python SDK: `client.py`, `hooks.py`, `mapper.py`
- `packages/sdk-python/tests/` — Python SDK tests (pytest)
- `scripts/test-anthropic-agent.py` — Anthropic agent integration smoke test
- `scripts/test-n8n-scenario.md` — n8n integration scenario doc
- `public/templates/n8n-atlas-reporter.json` — n8n HTTP reporter workflow template
- `.claude/skills/` — `find-skills/`, `save-learning/`, `setup-caliber/`
- `.claude/rules/` — path-scoped conventions (`cron.md`, `webhooks.md`, `git-conventions.md`, `middleware.md`)
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
- Evaluator deps (`@anthropic-ai/sdk`, `resend`) in `packages/evaluator/`, not `apps/web/`; import as `@atlas/evaluator`
- Vercel Cron: `apps/web/app/api/cron/evaluate/route.ts` — batch 5, `maxDuration=60`, auth via `CRON_SECRET`
- Python SDK: `packages/sdk-python/src/atlas_synapse/` — mapper transforms Anthropic SDK events to AtlasSynapse ingest payload; hooks wrap Anthropic client
- N8N: use `public/templates/n8n-atlas-reporter.json` template; add HTTP Request reporter node to each workflow; set `tokenCount: null` (n8n exposes no native token counts)
- Clerk middleware: any API route with its own auth (HMAC, Svix, bearer) must be added to `isPublicRoute` in `apps/web/middleware.ts`

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
