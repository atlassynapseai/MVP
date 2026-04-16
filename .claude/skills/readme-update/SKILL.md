---
name: readme-update
description: Updates README.md to reflect current project state: stack, setup steps, and architecture. Use when user says 'update readme', 'document this', 'reflect current stack', or after a significant architectural decision. Keeps README.md as the single source of truth for newcomers. Do NOT use for API docs, inline code comments, or CLAUDE.md/AGENTS.md updates.
paths:
  - README.md
---
# readme-update

Keeps `README.md` as single source of truth for newcomers. Reflects actual current state — no aspirational content.

## Critical

- **Never fabricate** setup commands. Only write commands verified to exist in the repo (check `package.json`, `Makefile`, `pyproject.toml`, etc.).
- **Never duplicate** content already owned by `CLAUDE.md` (agent conventions, caliber config). README targets humans, CLAUDE.md targets agents.
- **Read before writing.** Always read current `README.md` before any edit — preserve sections that are still accurate.
- Update `CLAUDE.md` `## Architecture` block too if the architectural description changed.

## Instructions

1. **Read current README**
   ```
   Read: README.md
   ```
   Note which sections exist and which are stale or missing. Verify each claim is still true.

2. **Audit repo structure**
   Glob for key files to confirm actual stack:
   ```
   Glob: package.json, pyproject.toml, Makefile, docker-compose.yml, src/**
   ```
   Read any found config files to extract real install/build/test commands.

3. **Determine required sections**
   README must contain, in order:
   - `# <Project Name>` — one-line description
   - `## Overview` — what problem this solves (2–4 sentences max)
   - `## Stack` — languages, frameworks, infra. Use a simple list.
   - `## Setup` — exact commands to clone, install, configure env, and run locally. Commands must be copy-pasteable.
   - `## Architecture` — directory tree or prose map of `src/` layout. Match actual file structure.
   - `## Contributing` — branch naming (`feat/<slug>`, `fix/<slug>`), commit style (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), PR requirements (explain *why*, link issues).

   Omit any section where the project context doesn't yet support it — mark as `<!-- TODO: add when stack is chosen -->` rather than inventing content.

4. **Write updated README**
   Use `Edit` for targeted changes to existing sections. Use `Write` only if README needs full restructure.

   Section template for `## Setup`:
   ```markdown
   ## Setup

   ```bash
   # 1. Install dependencies
   <exact command from package.json/Makefile>

   # 2. Copy env template
   cp .env.example .env

   # 3. Run locally
   <exact dev command>
   ```
   ```

   Section template for `## Architecture`:
   ```markdown
   ## Architecture

   ```
   src/
   ├── <dir>/   # <one-line purpose>
   └── <dir>/   # <one-line purpose>
   ```
   ```

5. **Sync CLAUDE.md if architecture changed**
   If directory structure or stack changed, update `## Architecture` in `CLAUDE.md` to match.
   Read `CLAUDE.md` first, then apply targeted `Edit`.

6. **Verify**
   - Every command in `## Setup` exists in a real config file or script.
   - No section contains "coming soon", "TBD", or aspirational future state — use `<!-- TODO -->` comments instead.
   - README does not duplicate agent-only content from `CLAUDE.md`.

## Examples

**User says:** "Update the readme to reflect we're using FastAPI + PostgreSQL"

**Actions taken:**
1. Read `README.md` — finds minimal placeholder content.
2. Glob for `pyproject.toml`, `docker-compose.yml` — confirms FastAPI dep, postgres service.
3. Read `pyproject.toml` — extracts `uvicorn src.main:app --reload` as dev command.
4. Write updated README with `## Stack` (Python 3.12, FastAPI, PostgreSQL 16), `## Setup` with real commands, `## Architecture` matching `src/` tree.
5. Edit `CLAUDE.md` `## Architecture` to add `src/` layout.

**Result:**
```markdown
# AtlasSynapse MVP

Intelligent data pipeline for ...

## Stack
- Python 3.12, FastAPI
- PostgreSQL 16
- Docker Compose (local dev)

## Setup

```bash
uv sync
cp .env.example .env
docker compose up -d db
uvicorn src.main:app --reload
```

## Architecture

```
src/
├── api/      # FastAPI routers
├── models/   # SQLAlchemy models
└── core/     # config, db session
```

## Contributing

Branches: `feat/<slug>` or `fix/<slug>` off `main`.
Commits: conventional (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
PRs: explain *why* in description; link related issues.
```

## Common Issues

**README has commands that don't exist in repo:**
Grep for the command name across the repo before writing. If not found, mark with `<!-- TODO: add once script exists -->` and do not write as runnable.

**Setup section is empty because stack not chosen yet:**
Write:
```markdown
## Setup

<!-- TODO: add install + run commands once stack is chosen -->
```
Do not invent placeholder commands.

**CLAUDE.md and README.md describe different architectures:**
Readme is human-facing; CLAUDE.md is agent-facing. Both must reflect the same actual structure. Fix CLAUDE.md `## Architecture` to match README after update.

**Edit conflicts with existing structure:**
If the existing README uses a different section order or heading style, preserve the existing style rather than imposing the template structure. Consistency with the existing doc beats adherence to the template.