# CLAUDE.md — termplex

<!-- Keep this file LEAN. Loaded every session — only universally applicable instructions.
For domain-specific knowledge, use .claude/skills/ (loaded on demand).
Budget: ~150 usable instruction slots. Test: "Would removing this cause mistakes?" If not, cut it. -->

## One-liner

CLI tool that launches configurable multi-pane terminal workspaces using tmux.

## Stack

TypeScript 5.7 · Node ≥ 18 · pnpm · tsup · Vitest · ESLint · zero runtime deps

## Build & Run

```bash
pnpm install          # install dependencies
pnpm build            # compile to dist/index.js (with shebang)
pnpm dev              # watch mode
pnpm typecheck        # type-check without emitting
pnpm lint             # check linting
pnpm test             # run tests once
pnpm test:watch       # run tests in watch mode
pnpm test:coverage    # run tests with v8 coverage
```

## Project Structure

```
src/
  index.ts         CLI entry point (parseArgs-based)
  config.ts        Config file read/write (~/.config/termplex/)
  layout.ts        Layout calculation (pure function)
  launcher.ts      tmux session builder
  globals.d.ts     Build-time constants (__VERSION__)
  *.test.ts        Co-located unit tests
```

## Code Style

- **Zero runtime dependencies** — stdlib only (`node:util`, `node:fs`, etc.)
- TypeScript strict mode with `noUncheckedIndexedAccess`
- ESM throughout (`"type": "module"`)
- Functional style — prefer pure functions, minimize side effects
- Co-located tests (`foo.test.ts` next to `foo.ts`)
- ESM CLI files use shebang — never run with `node`, use `chmod +x && ./cli` or `npx .`

## RPI Workflow

This project follows Research-Plan-Implement (RPI).

1. /research -- Understand the codebase as-is
2. /plan -- Create a phased implementation spec
3. /implement -- Execute one phase at a time with review gates
4. /validate -- Verify implementation against the plan

Each phase is its own conversation. STOP after each phase.
Use /clear between tasks, /compact when context is heavy.

## Key Commands

```bash
pnpm run typecheck      # Check types
pnpm run lint           # Check linting
pnpm run test           # Run all tests
pnpm run build          # Production build
pnpm run dev            # Watch mode
```

## Git Workflow

**`develop` is the default branch. `main` is production only.**

1. All development happens on `develop`
2. Never commit directly to `main`
3. Release to production via PR: `develop` -> `main`
4. Always run checks before committing (pre-commit hooks enforce this)
5. Always `git pull --rebase` before pushing

Run verification sequentially with `;` or `&&`,
never as parallel Bash calls.

### Commit Messages

Use conventional commits:
```
feat(scope): description (#issue)
fix(scope): description (#issue)
test(scope): description
refactor(scope): description
chore: description
docs: description
ci: description
```

Keep commits focused — one logical change per commit.
All commits must pass `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.

## Agent Behavior

Exhaust tools before asking the user. Production actions need human authorization.
Save operational lessons to auto memory immediately. Don't wait to be asked.

## Project File Locations

Go directly to these paths -- never search for them.

| Topic | Path | Notes |
|-------|------|-------|
| Source | `src/` | Co-located tests (`*.test.ts`) |
| Config | `~/.config/termplex/` | Runtime config dir |
| Research | `docs/research/YYYY-MM-DD-*.md` | |
| Plans | `docs/plans/YYYY-MM-DD-*.md` | `-phases/` |
