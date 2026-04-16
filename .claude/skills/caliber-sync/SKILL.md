---
name: caliber-sync
description: Manages caliber-based agent config sync: installs hooks, adds learnings, searches/installs skills. Use when user says 'sync agent config', 'remember this convention', 'find a skill for X', 'install caliber hook', or after editing CLAUDE.md/AGENTS.md. Wraps /opt/homebrew/bin/caliber commands. Do NOT use for one-off task instructions or general coding tasks.
paths:
  - .claude/**
  - CLAUDE.md
  - AGENTS.md
---
# caliber-sync

## Critical

- Caliber binary path: `/opt/homebrew/bin/caliber` — never assume it's on PATH without full path
- `caliber sync` rewrites `CLAUDE.md` and `AGENTS.md` — run only after confirming local edits are committed or intentionally overwritable
- Skills install into `.claude/skills/<slug>/SKILL.md` — verify slug before install to avoid clobbering existing skills
- Pre-commit hook runs `caliber sync` automatically on every commit — if hook not installed, sync is manual only

## Instructions

1. **Determine intent** from user request:
   - "sync" / "update agent config" → Step 2
   - "remember this" / "save learning" / "add convention" → Step 3
   - "find skill" / "skill for X" → Step 4
   - "install skill" + slug known → Step 5
   - "install hook" / "setup caliber" → Step 6

   Verify intent is clear before proceeding.

2. **Sync agent config**
   ```bash
   /opt/homebrew/bin/caliber sync
   ```
   Syncs `CLAUDE.md` and `AGENTS.md` from caliber's managed config. Run after any manual edit to either file, or when agent context feels stale.

   Verify output contains no errors before proceeding. On success, caliber prints updated file paths.

3. **Save a learning / convention**
   ```bash
   /opt/homebrew/bin/caliber learn add "<learning text>"
   ```
   Learning text must be a single quoted string — specific, actionable, and scoped to this project.

   GOOD: `"Always wrap DB calls in try/catch returning { error: string, code: number }"`
   BAD: `"Handle errors properly"`

   Verify the command exits 0. Caliber appends the learning to the managed config — it will appear in `CLAUDE.md` after the next `caliber sync`.

4. **Search for a skill**
   ```bash
   /opt/homebrew/bin/caliber skills --query "<technology or topic>"
   ```
   Use the technology name, not the task: `--query "fastapi"` not `--query "create api routes"`. Review returned slugs and descriptions before installing.

   Verify at least one result matches the user's need. If zero results, try a broader term.

5. **Install a skill** (uses output from Step 4)
   ```bash
   /opt/homebrew/bin/caliber skills --install <slug>
   ```
   Installs to `.claude/skills/<slug>/SKILL.md`. After install, read the file to confirm it contains relevant instructions before reporting success to the user.

   ```bash
   cat .claude/skills/<slug>/SKILL.md
   ```

6. **Install pre-commit hook**
   Use the `/setup-caliber` skill — it handles hook installation. Do not attempt manual hook setup here.

   Verify `.git/hooks/pre-commit` exists and contains a `caliber sync` call after running `/setup-caliber`.

## Examples

**User says:** "Remember that we always use conventional commits"
→ Actions:
```bash
/opt/homebrew/bin/caliber learn add "Commits must follow conventional commits: feat:, fix:, docs:, chore:, refactor: prefixes required"
```
→ Result: Learning queued in caliber. Runs `caliber sync` to propagate to `CLAUDE.md`.

---

**User says:** "Find a skill for FastAPI"
→ Actions:
```bash
/opt/homebrew/bin/caliber skills --query "fastapi"
```
→ Result: List of matching slugs printed. Present slugs and descriptions to user, ask which to install.

---

**User says:** "Sync agent config"
→ Actions:
```bash
/opt/homebrew/bin/caliber sync
```
→ Result: `CLAUDE.md` and `AGENTS.md` updated from caliber-managed source.

## Common Issues

**`command not found: caliber`**
Binary not on PATH in this shell. Always use full path:
```bash
/opt/homebrew/bin/caliber sync
```
If that also fails: `ls /opt/homebrew/bin/caliber` — if missing, user must reinstall caliber.

**`caliber sync` overwrites local edits**
Caliber is the source of truth. Local edits to `CLAUDE.md`/`AGENTS.md` are overwritten on sync. To preserve changes: use `caliber learn add` to persist conventions before syncing, or commit the file and check if caliber is configured to merge.

**Skill install fails with `slug not found`**
Slug from `--query` output must be copied exactly. Re-run `--query` and use the slug string verbatim:
```bash
/opt/homebrew/bin/caliber skills --query "<topic>"
/opt/homebrew/bin/caliber skills --install <exact-slug-from-output>
```

**Pre-commit hook not running caliber**
Check hook exists and is executable:
```bash
cat .git/hooks/pre-commit
ls -la .git/hooks/pre-commit
```
If missing or not executable: run `/setup-caliber` skill to reinstall.

**`caliber learn add` exits non-zero**
Learning text may contain unescaped quotes. Wrap entire string in single quotes and escape inner single quotes as `'\''`:
```bash
/opt/homebrew/bin/caliber learn add 'Use `unknown` not `any` in TypeScript'
```