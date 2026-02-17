# CLAUDE.md — termplex

## What is this project?

termplex is a CLI tool that launches configurable multi-pane terminal workspaces using tmux. It supports project registration, machine-level config, and customizable editor/sidebar layouts.

## Build & Run

```bash
pnpm install          # install dependencies
pnpm build            # compile to dist/index.js (with shebang)
pnpm dev              # watch mode
pnpm typecheck        # type-check without emitting
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

## Commit Conventions

- Format: `type: short description`
- Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`
- Keep commits focused — one logical change per commit
- All commits must pass `pnpm typecheck && pnpm build && pnpm test`
