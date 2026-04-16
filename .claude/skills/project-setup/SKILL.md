---
name: project-setup
description: Initializes tech stack for AtlasSynapse MVP: package manager, folder structure, first source files, linter, formatter. Use when user says 'set up project', 'initialize stack', 'add TypeScript/Python/Go', or starts the first real source file. Creates consistent structure from scratch. Do NOT use for adding features to an already-initialized codebase.
---
# project-setup

## Critical

- **Greenfield only** — do NOT run init commands if `src/`, `package.json`, `pyproject.toml`, or `go.mod` already exist. Check first.
- Update `CLAUDE.md` `## Setup`, `## Architecture`, and `## Key Patterns` sections after every stack init. Caliber syncs from this file.
- Conventional commits required from first commit: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- No `any` in TypeScript — use `unknown`. Enforce via tsconfig + eslint rule.
- Branch: create `feat/project-setup` before touching files. Merge to `main` via PR with *why* in description.

---

## Instructions

### Step 0 — Confirm greenfield

```bash
ls package.json pyproject.toml go.mod 2>/dev/null && echo 'EXISTS — STOP' || echo 'OK to proceed'
```

If any file exists, stop and ask user which stack is already present.

### Step 1 — Create feature branch

```bash
git checkout -b feat/project-setup
```

Verify `git branch --show-current` outputs `feat/project-setup` before proceeding.

---

### TypeScript (Node/Bun) path

**Step 2T — Init package manager**

Prefer `bun` if available, else `pnpm`.

```bash
# bun
bun init -y

# pnpm fallback
pnpm init
```

Verify `package.json` exists.

**Step 3T — Install core deps**

```bash
bun add -d typescript @types/node tsx
bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
bun add -d prettier
```

**Step 4T — tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

Verify `bun tsc --noEmit` exits 0.

**Step 5T — Folder structure**

```
src/
  index.ts        ← entrypoint
  types.ts        ← shared types (no `any`)
tests/
  index.test.ts
```

`src/index.ts` minimum:

```typescript
export function main(): void {
  console.log('AtlasSynapse MVP');
}

main();
```

**Step 6T — Linter + formatter config**

`eslint.config.mjs`:

```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsparser },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
];
```

`.prettierrc`:

```json
{ "semi": true, "singleQuote": true, "printWidth": 100 }
```

`package.json` scripts:

```json
"scripts": {
  "build": "tsc",
  "dev": "tsx src/index.ts",
  "lint": "eslint src",
  "format": "prettier --write src",
  "test": "bun test"
}
```

Verify: `bun run lint` exits 0, `bun run build` exits 0.

---

### Python path

**Step 2P — Init with uv**

```bash
uv init --name atlas-synapse-mvp
uv python pin 3.12
```

Verify `pyproject.toml` and `.python-version` exist.

**Step 3P — Core dev deps**

```bash
uv add --dev ruff mypy pytest
```

**Step 4P — Folder structure**

```
src/
  atlas_synapse/
    __init__.py
    main.py
tests/
  test_main.py
```

`src/atlas_synapse/main.py`:

```python
def main() -> None:
    print("AtlasSynapse MVP")


if __name__ == "__main__":
    main()
```

**Step 5P — pyproject.toml tool config**

Append to `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
select = ["E", "F", "I", "UP"]

[tool.mypy]
strict = true
python_version = "3.12"

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Verify: `uv run ruff check src` exits 0, `uv run mypy src` exits 0, `uv run pytest` exits 0.

---

### Go path

**Step 2G — Init module**

```bash
go mod init github.com/atlassynapse/mvp
```

Verify `go.mod` exists with correct module path.

**Step 3G — Folder structure**

```
cmd/
  server/
    main.go
internal/
  core/
    core.go
```

`cmd/server/main.go`:

```go
package main

import "fmt"

func main() {
	fmt.Println("AtlasSynapse MVP")
}
```

**Step 4G — Linter**

```bash
brew install golangci-lint  # if not present
```

`.golangci.yml`:

```yaml
linters:
  enable:
    - errcheck
    - govet
    - staticcheck
    - unused
```

Verify: `go build ./...` exits 0, `golangci-lint run` exits 0.

---

### Step 7 — Update CLAUDE.md (all stacks)

Replace `## Setup`, `## Architecture`, `## Key Patterns` placeholders in `CLAUDE.md` with actual commands and structure. Example for TypeScript:

```markdown
## Setup
\`\`\`bash
bun install
bun run dev
bun test
bun run lint
\`\`\`

## Architecture
- `src/index.ts` — entrypoint
- `src/types.ts` — shared types
- `tests/` — test files

## Key Patterns
- All types in `src/types.ts`, no inline `any`
- Entrypoint exports `main()` and calls it
```

### Step 8 — Pre-commit hook via caliber

```bash
/opt/homebrew/bin/caliber sync
```

Verify `.git/hooks/pre-commit` exists and is executable.

### Step 9 — Initial commit

Stage only known files (no secrets, no `node_modules`, no `.env`):

```bash
git add src/ tests/ package.json tsconfig.json eslint.config.mjs .prettierrc CLAUDE.md
git commit -m "feat: initialize TypeScript project structure"
```

---

## Examples

**User says:** "Set up this project with TypeScript and Bun"

**Actions:**
1. Check no `package.json` exists → OK
2. `git checkout -b feat/project-setup`
3. `bun init -y` → installs deps
4. Write `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`
5. Create `src/index.ts`, `src/types.ts`, `tests/index.test.ts`
6. `bun run lint && bun run build` → both exit 0
7. Update `CLAUDE.md` Setup/Architecture/Key Patterns sections
8. `/opt/homebrew/bin/caliber sync`
9. `git add ... && git commit -m "feat: initialize TypeScript project structure"`

**Result:** Repo has typed, linted, tested skeleton. `CLAUDE.md` reflects real stack. Pre-commit hook active.

---

## Common Issues

**`bun: command not found`**
→ Use `pnpm` fallback or `curl -fsSL https://bun.sh/install | bash` then restart shell.

**`tsc: error TS5095: Option 'moduleResolution' must be set`**
→ Ensure `"module": "ESNext"` and `"moduleResolution": "bundler"` are both set in tsconfig.

**`eslint: No files matching the pattern 'src'`**
→ `src/` directory not created yet. Create `src/index.ts` before running lint.

**`caliber sync` fails with `command not found`**
→ Full path: `/opt/homebrew/bin/caliber sync`. If still missing: `brew install caliber` or check with user.

**`uv: python 3.12 not found`**
→ `uv python install 3.12` then retry `uv python pin 3.12`.

**`go mod init` fails with "module path must not contain uppercase"**
→ Use lowercase: `github.com/atlassynapse/mvp` not `AtlasSynapse`.

**Pre-commit hook blocks commit with lint errors**
→ Fix lint errors first. Do NOT use `--no-verify` to bypass. Run `bun run lint --fix` (TS) or `uv run ruff check --fix src` (Python) to auto-fix safe issues.