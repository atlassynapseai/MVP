---
name: feature-scaffold
description: Scaffolds a new feature with proper file structure, naming, exports, and test placement. Use when user says 'add feature', 'create module', 'new screen', or 'scaffold X'. Ensures consistent naming and conventional commit for scaffold commit. Do NOT use for small edits to existing features or single-file changes.
paths:
  - src/features/**
  - src/modules/**
---
# Feature Scaffold

## Critical

- Stack not yet chosen — scaffold in language-agnostic structure until `## Setup` and `## Architecture` exist in `CLAUDE.md`. Once stack is defined, update this skill.
- Never use `any` in TypeScript — use `unknown`.
- Feature branch required before scaffolding: `feat/<short-slug>`.
- Every scaffold needs a test file — no feature ships without one.
- Verify `CLAUDE.md` has stack context before picking file extensions. If missing, ask user: "What language/framework?" before proceeding.

## Instructions

### Step 1 — Create feature branch

```bash
git checkout -b feat/<feature-slug>
```

Naming: kebab-case, descriptive noun (`user-auth`, `invoice-list`, `report-export`).

Verify: `git branch --show-current` returns `feat/<feature-slug>` before proceeding.

### Step 2 — Determine feature directory

Check `CLAUDE.md` `## Architecture` section for `src/` structure.

- If architecture defined: place under the documented path (e.g. `src/features/<name>/` or `src/modules/<name>/`).
- If architecture NOT yet defined: use `src/features/<name>/` as default. Add a `# TODO: confirm src layout` comment in the created index file.

Verify: parent directory exists or create it. Never create deeply nested dirs without confirming with user.

### Step 3 — Create core files

Minimum scaffold for any feature:

```
src/features/<name>/
  index.<ext>          # public API — re-exports only
  <name>.<ext>         # main logic
  <name>.test.<ext>    # test file (co-located)
  types.<ext>          # shared types for this feature (if needed)
```

`index.<ext>` must only re-export — no logic:
```ts
// src/features/<name>/index.ts
export * from './<name>';
export * from './types';
```

`<name>.<ext>` — stub with TODO:
```ts
// src/features/<name>/<name>.ts
// TODO: implement <name>
export function <name>() {
  throw new Error('Not implemented');
}
```

`<name>.test.<ext>` — failing test first (TDD gate):
```ts
// src/features/<name>/<name>.test.ts
import { <name> } from './<name>';

describe('<name>', () => {
  it('should be implemented', () => {
    expect(() => <name>()).not.toThrow();
  });
});
```

Verify: all three files created before proceeding.

### Step 4 — Register feature (if applicable)

Check for a central registry file (e.g. `src/features/index.ts`, `src/routes.ts`, `src/app.ts`).

- If registry exists: add export/import for new feature.
- If no registry exists: skip and note in commit message.

Verify: no circular imports introduced.

### Step 5 — Commit scaffold

Use conventional commit:

```bash
git add src/features/<name>/
git commit -m "feat(<name>): scaffold <name> feature structure"
```

Commit must include only scaffold files — no logic yet.

Verify: `git log --oneline -1` shows correct conventional commit format.

## Examples

**User says:** "Scaffold an invoice export feature"

**Actions taken:**
1. `git checkout -b feat/invoice-export`
2. Check `CLAUDE.md` — no stack defined yet → use `src/features/invoice-export/` with TypeScript assumption, ask user to confirm extension
3. Create:
   - `src/features/invoice-export/index.ts`
   - `src/features/invoice-export/invoice-export.ts`
   - `src/features/invoice-export/invoice-export.test.ts`
   - `src/features/invoice-export/types.ts`
4. No registry found → skip Step 4
5. `git commit -m "feat(invoice-export): scaffold invoice-export feature structure"`

**Result:**
```
src/features/invoice-export/
  index.ts
  invoice-export.ts
  invoice-export.test.ts
  types.ts
```

## Common Issues

**"Stack not defined — what extension should I use?"**
Update `CLAUDE.md` `## Architecture` with chosen language. Until then, ask user explicitly before creating files.

**Test runner not configured:**
If `<name>.test.<ext>` can't run: check `CLAUDE.md` `## Commands` for test command. If missing, add it before scaffolding tests.

**Circular import after registry update:**
If you see `Error: Circular dependency detected`: feature's `index.ts` is importing from registry. Registry imports features — features must not import registry.

**Branch already exists:**
If `git checkout -b feat/<slug>` fails with `fatal: A branch named 'feat/<slug>' already exists`: switch with `git checkout feat/<slug>` and verify it's clean before adding files.

**Naming conflict:**
If `src/features/<name>/` already exists: stop, check existing content, ask user whether to extend or rename. Never overwrite without confirmation.