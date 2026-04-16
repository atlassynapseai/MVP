---
name: git-workflow
description: Guides branch creation, conventional commits, and PR descriptions for AtlasSynapse MVP. Use when user says 'commit this', 'create PR', 'what branch should I use', 'push my changes', or before any git operation. Enforces feat:/fix:/chore: prefixes and branch naming conventions. Do NOT use for merge conflict resolution or rebasing strategies.
---
# git-workflow

## Critical

- NEVER commit directly to `main` — all work goes through feature branches
- NEVER use `--no-verify` to skip pre-commit hooks — caliber sync runs there
- NEVER write PR descriptions that explain *what* changed — explain *why*
- Branch name MUST match pattern: `feat/<short-slug>` or `fix/<short-slug>`
- Commit prefix MUST be one of: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`
- No `any` in TypeScript — use `unknown`

## Instructions

### Step 1 — Determine the right branch name

1. Identify change type:
   - New capability → `feat/<slug>`
   - Bug fix → `fix/<slug>`
   - Docs, tooling, deps → `chore/<slug>` or `docs/<slug>`
2. Make slug lowercase, hyphenated, ≤4 words. Example: `feat/user-auth-flow`
3. Create and switch:
   ```bash
   git checkout -b feat/<short-slug>
   ```
4. Verify you are NOT on `main`:
   ```bash
   git branch --show-current
   ```
   Must NOT return `main`. If it does, stop and create the branch.

### Step 2 — Stage changes

1. Stage specific files — never `git add .` blindly:
   ```bash
   git add <file1> <file2>
   ```
2. Review what will be committed:
   ```bash
   git diff --staged
   ```
3. Verify no secrets, `.env` files, or build artifacts are staged. If found, unstage:
   ```bash
   git restore --staged <file>
   ```

### Step 3 — Write the commit message

Format: `<type>(<optional-scope>): <short imperative description>`

Allowed types: `feat`, `fix`, `docs`, `chore`, `refactor`

Examples:
```
feat(auth): add JWT refresh token endpoint
fix(db): correct pool size default causing connection leak
docs: add setup section to CLAUDE.md
chore: install caliber pre-commit hook
refactor(api): extract error handler into middleware
```

Rules:
- Subject line ≤72 chars
- Imperative mood: "add" not "added" or "adds"
- No period at end
- Body optional — use for *why*, not *what*

Commit:
```bash
git commit -m "feat(scope): description"
```

Verify pre-commit hook ran (caliber sync output should appear). If hook fails, fix the issue — do NOT use `--no-verify`.

### Step 4 — Push branch

```bash
git push -u origin feat/<short-slug>
```

Verify push succeeded:
```bash
git status
```
Should show `Your branch is up to date with 'origin/feat/<short-slug>'`.

### Step 5 — Create PR

Use `gh` CLI:
```bash
gh pr create --title "feat: <short description>" --body "$(cat <<'EOF'
## Why
<Explain the motivation — what problem this solves, what requirement drives it>

## Changes
- <bullet the key changes — brief>

## Testing
- [ ] <what to verify manually or via tests>

Closes #<issue-number if applicable>
EOF
)"
```

PR description rules:
- `## Why` section is REQUIRED — explains motivation, not mechanics
- Link issues with `Closes #N` if one exists
- Title matches commit prefix convention

Verify PR created:
```bash
gh pr view
```

## Examples

**User says:** "Commit my changes to the caliber hook setup"

Actions:
1. Check current branch: `git branch --show-current` → returns `main`
2. Create branch: `git checkout -b chore/caliber-hook-setup`
3. Stage: `git add .claude/ CLAUDE.md`
4. Review diff: `git diff --staged` — confirm only hook files staged
5. Commit: `git commit -m "chore: install caliber pre-commit hook for agent config sync"`
6. Push: `git push -u origin chore/caliber-hook-setup`
7. PR:
   ```
   Title: chore: install caliber pre-commit hook
   Why: Without the hook, CLAUDE.md and AGENTS.md drift out of sync
        when devs forget to run `caliber sync` manually.
   ```

**Result:** Branch `chore/caliber-hook-setup` with one conventional commit, PR explaining the sync problem it solves.

## Common Issues

**Pre-commit hook fails with `caliber: command not found`:**
1. Verify caliber installed: `ls /opt/homebrew/bin/caliber`
2. If missing, run the `/setup-caliber` skill to reinstall
3. Do NOT use `--no-verify` to bypass

**Commit rejected: "type must be one of feat|fix|docs|chore|refactor":**
Your prefix is wrong. Common mistakes: `update:`, `add:`, `change:` — remap to the correct type and recommit.

**Push rejected: `remote: error: GH006: Protected branch update failed`:**
You are pushing to `main`. Stop. Create a feature branch: `git checkout -b feat/<slug>` then push that.

**`gh pr create` fails with `no GitHub credentials`:**
```bash
gh auth login
```
Choose HTTPS and authenticate with company@atlassynapseai.com account.

**Hook ran but `caliber sync` output shows drift warnings:**
Review the diff caliber prints. Stage the auto-updated files and amend the commit:
```bash
git add CLAUDE.md AGENTS.md
git commit --amend --no-edit
```
(Amend is safe here — commit hasn't been pushed yet.)