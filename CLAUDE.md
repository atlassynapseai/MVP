# MVP — Claude Code Context

## Project
AtlasSynapse MVP. Greenfield — no source files yet. Add stack details here as the project grows.

## Commands
```bash
# Update these as stack is chosen
# caliber sync
/opt/homebrew/bin/caliber sync

# Search community skills
/opt/homebrew/bin/caliber skills --query "<technology>"

# Install a skill
/opt/homebrew/bin/caliber skills --install <slug>

# Save a project learning
/opt/homebrew/bin/caliber learn add "<learning>"
```

## Architecture
- **Root**: `README.md` — project overview (currently minimal)
- **Agent config**: `CLAUDE.md` (Claude), `AGENTS.md` (Codex)
- **Claude skills**: `.claude/skills/` — `find-skills/`, `save-learning/`, `setup-caliber/`
- **Claude rules**: `.claude/rules/` — path-scoped conventions
- **Claude hooks**: `.claude/hooks/` — `caliber-session-freshness.sh`, `caliber-check-sync.sh`, `caliber-freshness-notify.sh`

## Conventions
- Commits: conventional commits — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Branches: feature branches off `main`; name as `feat/<short-slug>` or `fix/<short-slug>`
- PRs: description must explain *why*, not *what*; link issues
- No `any` in TypeScript (when added) — use `unknown`
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
- Add servers: edit `.mcp.json`, run `caliber sync`

## wshobson/agents Plugins Active
- `python-development`, `javascript-typescript`, `backend-development`
- `kubernetes-operations`, `cloud-infrastructure`, `security-scanning`
- `comprehensive-review`, `full-stack-orchestration`

## Adding Stack Context
When a tech stack is chosen, update this file with:
- `## Setup` — install + build + test commands
- `## Architecture` — actual `src/` structure
- `## Key Patterns` — how to add routes, components, DB queries

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
