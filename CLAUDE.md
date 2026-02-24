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

This project follows the Research-Plan-Implement (RPI) pattern.
All significant changes go through four phases:
1. /research — Understand the codebase as-is
2. /plan — Create a phased implementation spec
3. /implement — Execute one phase at a time with review gates
4. /validate — Verify implementation against the plan

### Context Management

- Each RPI phase should be its own conversation. Don't run research + plan + implement in one session.
- Use `/clear` between unrelated tasks. Use `/compact` when context is heavy but the task continues.
- Subagents are context control mechanisms — they search/read in their window and return only distilled results.
- Research and planning happen on `develop`. Implementation happens in worktrees or feature branches.
- If research comes back wrong, throw it out and restart with more specific steering.

### Rules for All Phases

- Read all mentioned files COMPLETELY before doing anything else.
- Never suggest improvements during research — only document what exists.
- Every code reference must include file:line.
- Spawn parallel subagents for independent research tasks.
- Wait for ALL subagents before synthesizing.
- Never write documents with placeholder values.

### Rules for Implementation

- Follow the atomic loop: implement → review → fix → approve.
- Run ALL automated verification after each phase.
- STOP after each phase and wait for human confirmation.
- Never auto-proceed to the next phase.
- If the plan doesn't match reality, STOP and explain the mismatch.

### Testing Philosophy

- Prefer automated verification over manual testing.
- Manual testing is ONLY for: sudo, hardware, new installs, truly visual-only validation.
- If you can verify it with a command or tool, do so automatically.
- Don't use Claude for linting/formatting — use automated tools and hooks instead.

## Key Commands

```bash
pnpm run typecheck      # Check types
pnpm run lint           # Check linting
pnpm run test           # Run all tests
pnpm run build          # Production build
pnpm run dev            # Watch mode
```

### CRITICAL: Run verification commands sequentially, NEVER in parallel
Never run typecheck, lint, or test as parallel sibling Bash tool calls.
Chain with `&&` or `;`: `pnpm run typecheck 2>&1; pnpm run lint 2>&1`

## Git Workflow

**`develop` is the default branch. `main` is production only.**

1. All development happens on `develop`
2. Never commit directly to `main`
3. Release to production via PR: `develop` → `main`
4. Always run checks before committing (pre-commit hooks enforce this)
5. Always `git pull --rebase` before pushing

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

## Agent Operational Rules

### Shell & Tools
- Chain verification commands sequentially, never as parallel Bash calls
- In worktrees: prefix every command with `cd /absolute/path && `
- Never use `~` in file tool paths — use full absolute paths starting with `/`
- Always pass `{ encoding: 'utf-8' }` to `execSync`/`spawnSync`

### Git Operations
- Run typecheck/lint BEFORE committing (pre-commit hooks run the same checks)
- `git pull --rebase` before every push
- Remove worktrees BEFORE merging PRs with `--delete-branch`
- `git worktree remove --force` (always use --force)
- Use `;` not `&&` for multiple cleanup operations
- Use `git push -u` on first push of any branch
- Use `git branch -D` (uppercase) for worktree branches

### GitHub CLI
- Don't guess `gh --json` field names — query available fields first
- Check CI per-PR with `--json`, not chained human-readable output
- `review: fail` means "needs approval", NOT a CI failure

### Sub-agents & Agent Teams
- Agent Teams are enabled via `.claude/settings.json`
- When creating a team: break work so each teammate owns different files (avoid conflicts)
- Teammates don't inherit conversation history — include full context in spawn prompts

## Push Accountability

Every push to the development branch requires CI verification. After pushing:
1. Spawn a background agent to monitor CI: `gh run list --branch develop --limit 1`
2. If CI passes — log and move on
3. If CI fails — background agent investigates with `gh run view <id> --log-failed`, fixes, and re-pushes
4. Main terminal continues working — push verification is non-blocking
5. Never push to production from a background fix

## TDD Protocol

All code changes follow Red-Green-Refactor:
1. **Red** — Write a failing test FIRST
2. **Green** — Minimum code to pass
3. **Refactor** — Clean up with green tests

No exceptions. Bug fixes need a regression test. Refactors need existing coverage. No "tests later."

## Agent Autonomy

Before asking the user to do anything manually:
1. Exhaust CLI tools (`gh`, `git`, project CLIs)
2. Exhaust shell commands (curl, build scripts)
3. Exhaust file tools (Read/Edit/Write for config changes)
4. Only then ask for human help — with a clear explanation of what you tried

## Memory Management

When you discover an operational lesson during any session — CI failure pattern, permission issue, workaround, tooling quirk — save it to auto memory immediately.

After completing `/research`, `/plan`, `/implement`, or any significant configuration change, save the key decisions and project context to auto memory.

## Research Documents
Store in: docs/research/YYYY-MM-DD-description.md

## Implementation Plans
Store in: docs/plans/YYYY-MM-DD-description.md
Phase files: docs/plans/YYYY-MM-DD-description-phases/phase-N.md
