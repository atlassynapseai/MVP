---
paths:
  - CLAUDE.md
  - AGENTS.md
  - .claude/rules/**
  - .claude/skills/**
  - .claude/hooks/**
  - .agents/skills/**
---

# Agent Config Files

## What Each File Does
- `CLAUDE.md` — Claude Code context (commands, architecture, conventions)
- `AGENTS.md` — Codex agent context (mirrors `CLAUDE.md`)
- `.claude/rules/*.md` — path-scoped rules loaded by Claude Code
- `.claude/skills/<name>/SKILL.md` — OpenSkills format, YAML frontmatter required
- `.claude/hooks/*.sh` — caliber lifecycle hooks (wired via `.claude/settings.json`)

## Editing Rules
- Keep `CLAUDE.md` under 400 lines — dense references, not prose
- Every file path in backticks
- Run `/opt/homebrew/bin/caliber refresh` after editing to propagate changes
- Add new skills via `/opt/homebrew/bin/caliber skills --install <slug>`

## Sync
```bash
/opt/homebrew/bin/caliber refresh
/opt/homebrew/bin/caliber learn add "<learning>"
git add CLAUDE.md AGENTS.md && git commit -m "chore: update agent config"
```
