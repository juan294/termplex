# Plan: Shell Tab Completion

**Date:** 2026-03-07
**Research:** [docs/research/2026-03-07-shell-completion.md](../research/2026-03-07-shell-completion.md)

## Goal

Add shell tab completion so that typing `ws <TAB>` or `ws cod<TAB>` completes project names, subcommands, and flags. Support bash, zsh, and fish shells.

## Design Decisions

### 1. File-read approach for dynamic data (not callback)
The completion scripts will read `~/.config/termplex/projects` directly using shell builtins (`cut -d= -f1`) rather than calling back into the Node.js binary. This avoids ~200ms Node.js startup latency on each Tab press and keeps completions instant. The projects file format (`key=value`) is trivially parseable by shell tools.

### 2. New `completion.ts` module
Completion script generators live in a dedicated module (`src/completion.ts`), consistent with the project's one-module-per-concern structure. Each shell gets a pure function that returns the script as a string.

### 3. `completion` subcommand added to CLI
New subcommand: `termplex completion [bash|zsh|fish]`. Outputs the completion script to stdout. Users source it in their shell config.

### 4. Both binary names supported
The generated scripts register completions for both `termplex` and `ws` since both are declared in `package.json:8-9`.

### 5. No auto-install into shell config
The tool prints the script to stdout along with instructions. Modifying `~/.bashrc` or `~/.zshrc` automatically is risky and opinionated. Users copy-paste one line.

## Architecture

```
src/
  completion.ts       NEW — pure functions: bashCompletion(), zshCompletion(), fishCompletion()
  completion.test.ts  NEW — co-located unit tests
  index.ts            MODIFIED — add "completion" case to switch statement + update HELP text
```

No changes to `config.ts`, `layout.ts`, or `launcher.ts`.

## Completion Contexts

| User types | Completes with |
|-----------|---------------|
| `ws <TAB>` | subcommands + project names + `.` |
| `ws cod<TAB>` | matching project names (e.g., `co-pilot-rpi`) |
| `ws remove <TAB>` | project names |
| `ws set <TAB>` | config keys |
| `ws set layout <TAB>` | layout presets |
| `ws --layout <TAB>` | layout presets |
| `ws --<TAB>` | all long flags |
| `ws -<TAB>` | all short flags |
| `ws add` | no completion (user provides new name + path) |

## Phases

| Phase | Scope | Files Changed |
|-------|-------|---------------|
| 1 | Completion module + all shell scripts + CLI wiring + tests | `completion.ts`, `completion.test.ts`, `index.ts` |
| 2 | Documentation: help text, user manual, architecture doc | `index.ts`, `docs/user-manual.md`, `docs/architecture.md` |

Phase files: [phase-1.md](./2026-03-07-shell-completion-phases/phase-1.md), [phase-2.md](./2026-03-07-shell-completion-phases/phase-2.md)

## Verification

All phases verified automatically:
```bash
pnpm run typecheck 2>&1; pnpm run lint 2>&1; pnpm run test 2>&1; pnpm run build 2>&1
```

Manual verification (optional, after Phase 1):
```bash
eval "$(./dist/index.js completion zsh)"
ws <TAB>
```
