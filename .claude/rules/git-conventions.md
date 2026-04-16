---
# No paths: field — applies globally
---

# Git Conventions

## Commit Format
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- Subject line: imperative, max 72 chars, no period
- Body: explain *why*, not *what* — reference issues with `Closes #N`

## Branching
- Branch off `main`
- Name: `feat/<short-slug>`, `fix/<short-slug>`, `chore/<short-slug>`
- Delete branch after merge

## PRs
- Title matches commit subject format
- Body must include: motivation, what changed, how to test
- Never force-push to `main`
