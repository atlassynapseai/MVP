# MVP — Codex Agent Context

## Project
AtlasSynapse MVP. Greenfield — no source files yet.

## Commands
```bash
# Caliber refresh (agent config)
/opt/homebrew/bin/caliber refresh

# Search community skills
/opt/homebrew/bin/caliber skills --query "<technology>"

# Save a project learning
/opt/homebrew/bin/caliber learn add "<learning>"
```

## File Map
- `README.md` — project overview
- `CLAUDE.md` — Claude Code context
- `AGENTS.md` — this file (Codex context)
- `.claude/skills/` — `find-skills/`, `save-learning/`, `setup-caliber/`
- `.claude/hooks/` — caliber lifecycle hooks (session, stop, notify)
- `.agents/skills/` — Codex-specific skills (mirror of `.claude/skills/`)

## Conventions
- Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- Branches: `feat/<slug>`, `fix/<slug>` off `main`
- PRs: explain *why* in body, link issues
- No force-push to `main`

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
