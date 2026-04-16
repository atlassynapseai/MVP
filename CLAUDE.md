# MVP — Claude Code Context

## Project
AtlasSynapse MVP. "HR for Your AI" — monitor AI agents like employees.

## Stack
- **Monorepo**: pnpm + Turborepo
- **Web**: Next.js 15 App Router, TypeScript strict, Tailwind + shadcn/ui + lucide-icons, Clerk auth (`@atlas/web`)
- **Edge**: Cloudflare Workers + Hono — ingest + PII strip (`@atlas/edge`)
- **DB**: Postgres/Supabase + Prisma ORM (`@atlas/db`)
- **Shared**: HMAC, PII utils, Zod schemas, types (`@atlas/shared`)
- **AI**: Anthropic Claude Sonnet 4.5 (eval + translate)
- **Evaluator**: `packages/evaluator/` — eval, alert, dedup, translate (`@atlas/evaluator`)
- **Python SDK**: `packages/sdk-python/` — `atlas-synapse` Python client with hooks, mapper, Anthropic agent support
- **Testing**: Vitest + Playwright + pytest
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

## Commands
```bash
# caliber refresh
/opt/homebrew/bin/caliber refresh

# Search community skills
/opt/homebrew/bin/caliber skills --query "<technology>"

# Install a skill
/opt/homebrew/bin/caliber skills --install <slug>

# Save a project learning
/opt/homebrew/bin/caliber learn add "<learning>"
```

## Architecture
- **Root**: `README.md` — project overview
- **Agent config**: `CLAUDE.md` (Claude), `AGENTS.md` (Codex)
- **Web app**: `apps/web/` — Next.js 15 App Router (`@atlas/web`)
  - `apps/web/.eslintrc.json` — ESLint config; required for `next lint` to run non-interactively in CI
  - `apps/web/app/dashboard/` — dashboard pages: agents, incidents, settings, data-transparency
    - `apps/web/app/dashboard/incidents/[id]/` — incident detail page with feedback form
    - `apps/web/app/dashboard/settings/` — alert preference form (`alert-pref-form.tsx`)
  - `apps/web/app/api/ingest/` — ingest API route
  - `apps/web/app/api/alert-prefs/` — alert preferences API route
  - `apps/web/app/api/feedback/` — feedback submission API route
  - `apps/web/app/api/webhooks/` — Clerk webhook handler
  - `apps/web/app/api/cron/` — Vercel Cron handler (evaluate, every 60s)
  - `apps/web/app/sign-in/` — Clerk sign-in page
  - `apps/web/app/sign-up/` — Clerk sign-up page
  - `apps/web/components/` — shared UI components (sidebar, etc.)
  - `apps/web/middleware.ts` — Clerk auth middleware
- **Edge worker**: `apps/edge/src/` — Hono ingest handler + PII strip (`@atlas/edge`)
- **Database**: `packages/db/` — Prisma schema + client re-export (`@atlas/db`)
- **Shared**: `packages/shared/src/` — `hmac.ts`, `pii.ts`, `schemas.ts`, `types.ts` (`@atlas/shared`)
- **Evaluator**: `packages/evaluator/src/` — `evaluate.ts`, `alert.ts`, `dedup.ts`, `translate.ts`, `prompts.ts` (`@atlas/evaluator`)
- **Python SDK**: `packages/sdk-python/src/atlas_synapse/` — `client.py`, `hooks.py`, `mapper.py`; tests in `packages/sdk-python/tests/`
- **Scripts**: `scripts/test-anthropic-agent.py` — Anthropic agent integration smoke test; `scripts/test-n8n-scenario.md` — n8n scenario doc; `scripts/seed-connection.mjs` — seed a Connection row for local ingest testing
- **N8N template**: `public/templates/n8n-atlas-reporter.json` — n8n HTTP reporter workflow template
- **Claude skills**: `.claude/skills/` — `find-skills/`, `save-learning/`, `setup-caliber/`
- **Claude rules**: `.claude/rules/` — path-scoped conventions (`cron.md`, `webhooks.md`, `git-conventions.md`, `middleware.md`, `security-patterns.md`)
- **Claude hooks**: `.claude/hooks/` — `caliber-session-freshness.sh`, `caliber-check-sync.sh`, `caliber-freshness-notify.sh`
- **Caveman plugin**: `caveman/` — terse caveman mode (skills, rules, evals, hooks)
- **Deployment**: `vercel.json` — Vercel env bindings + cron schedule (`* * * * *` → `/api/cron/evaluate`)

## Key Patterns
- Add dashboard pages: `apps/web/app/dashboard/<page>/page.tsx`
- Dashboard forms: co-locate as `<page>/<form-name>-form.tsx` (e.g. `settings/alert-pref-form.tsx`, `incidents/[id]/feedback-form.tsx`)
- DB queries via `packages/db/src/index.ts` (Prisma client re-export)
- Ingest payload validation: `packages/shared/src/schemas.ts` (Zod)
- PII redaction: `packages/shared/src/pii.ts`
- HMAC token verification: `packages/shared/src/hmac.ts`
- Shared types: `packages/shared/src/types.ts`
- Edge routes in `apps/edge/src/index.ts` (Hono)
- Clerk webhooks in `apps/web/app/api/webhooks/clerk/route.ts` — upsert Org before User; membership events can arrive before `organization.created`
- Evaluator deps (`@anthropic-ai/sdk`, `resend`) in `packages/evaluator/`, not `apps/web/`; import as `@atlas/evaluator`
- Vercel Cron: `apps/web/app/api/cron/evaluate/route.ts` — batch 5, `maxDuration=60`, auth via `CRON_SECRET`; schedule in `vercel.json`
- Python SDK: mapper in `packages/sdk-python/src/atlas_synapse/mapper.py` transforms Anthropic SDK events → AtlasSynapse ingest payload; hooks wrap Anthropic client
- N8N: import `public/templates/n8n-atlas-reporter.json`; add HTTP Request reporter node per workflow; always set `tokenCount: null` (n8n has no native token count exposure)
- Clerk middleware: any API route with its own auth (HMAC, Svix, bearer) must be in `isPublicRoute` in `apps/web/middleware.ts` — see `.claude/rules/middleware.md`

## Conventions
- Commits: conventional commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Branches: feature branches off `main`; name as `feat/<short-slug>` or `fix/<short-slug>`
- PRs: description must explain *why*, not *what*; link issues
- No `any` in TypeScript — use `unknown`
- Prefer explicit over implicit — name things clearly

## Agent Config Sync
- Caliber manages `CLAUDE.md`, `AGENTS.md`, and rules automatically
- Pre-commit hook syncs on every commit (install via `/setup-caliber` skill)
- Session hooks in `.claude/settings.json` auto-refresh on `SessionEnd`, check freshness on `SessionStart`
- Skills dir: `.claude/skills/<name>/SKILL.md`
- Add learnings: use `/save-learning` skill

## Operating Mode

**Default (steady-state):** caveman ultra — max token efficiency, terse execution-first, no fluff.  
**During setup/debug:** normal concise technical — correctness over compression.  
**Switch:** user says "normal mode" to disable, "caveman" to re-enable.

## Claude Responsibilities (Control Plane)
- Architecture decisions + tech stack choices
- Task decomposition + delegation to Codex
- PR review + merge approval
- MCP orchestration
- CLAUDE.md / AGENTS.md updates
- Caliber sync management
- Escalation handling

## Codex Responsibilities (Execution Plane)
- Scoped feature implementation (bounded by task spec)
- File edits within defined scope
- Tests for implemented features
- Never pushes to `main` — always feature branch
- Reads task spec from handoff packet (see Delegation below)

## Delegation Format (Claude → Codex)
When delegating, Claude provides:
```
TASK: <one-line description>
SCOPE: <files/dirs in scope>
OUT_OF_SCOPE: <explicit exclusions>
ACCEPTANCE: <how to verify done>
BRANCH: feat/<slug>
```

## MCP Servers
- `filesystem` — repo-scoped file access (shared)
- `github` — PRs/issues/branches (Claude primary)
- Config: `.mcp.json`
- Add servers: edit `.mcp.json`, run `caliber refresh`

## wshobson/agents Plugins Active
- `python-development`, `javascript-typescript`, `backend-development`
- `kubernetes-operations`, `cloud-infrastructure`, `security-scanning`
- `comprehensive-review`, `full-stack-orchestration`

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
## Session Learnings

Read `CALIBER_LEARNINGS.md` for patterns and anti-patterns learned from previous sessions.
These are auto-extracted from real tool usage — treat them as project-specific rules.
## Context Sync

This project uses [Caliber](https://github.com/caliber-ai-org/ai-setup) to keep AI agent configs in sync across Claude Code, Cursor, Copilot, and Codex.
Configs update automatically before each commit via `/opt/homebrew/bin/caliber refresh`.
If the pre-commit hook is not set up, run `/setup-caliber` to configure everything automatically.

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
