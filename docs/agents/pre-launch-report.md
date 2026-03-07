# Pre-Launch Audit Report
> Generated on 2026-03-07 | Branch: `develop` | Version: 0.1.8 | 6 parallel specialists

## Verdict: CONDITIONAL

Two blockers found — both are quick fixes (< 5 min total). No structural issues.

---

## Blockers (must fix before release)

### B1. `--no-mouse` flag is broken
**Found by:** UX Reviewer | **Severity:** HIGH

The help text documents `--mouse / --no-mouse`, and all three completion scripts advertise `--no-mouse`. However, running `termplex . --no-mouse` crashes:
```
Error: Unknown option '--no-mouse'
```
`node:util parseArgs` requires explicit opt-in for `--no-*` negation.

**File:** `src/index.ts:82` — missing `allowNegative: true` in parseOpts
**Fix:** Add `allowNegative: true` to the `parseOpts` object.

---

### B2. Error message references non-existent command
**Found by:** UX Reviewer | **Severity:** MEDIUM

When a command is not installed and no auto-install method is found:
```
Please install `<cmd>` manually or change your config with: termplex config set editor <command>
```
The correct command is `termplex set editor <command>`. There is no `config set` subcommand.

**File:** `src/launcher.ts:129`
**Fix:** Change `termplex config set` to `termplex set`.

---

## Warnings

| # | Issue | Severity | Found by | Risk |
|---|-------|----------|----------|------|
| W1 | Source map (44.7 KB) shipped in npm package — nearly doubles package size | Low | Performance | Wasted bandwidth for users |
| W2 | 6 high-severity vulns in devDependencies (minimatch ReDoS, rollup path traversal) | Low | Security | Dev-only; zero runtime deps, don't ship to users |
| W3 | Command values from `.termplex` files interpolated into `execSync` without sanitization | Medium | Security | Malicious `.termplex` in a cloned repo could execute arbitrary commands. Same trust model as Makefile/`.envrc`. |
| W4 | `index.ts` has 0% test coverage (237 lines of CLI dispatch) | Medium | QA | Argument parsing, subcommand routing untested |
| W5 | `launcher.ts` at 67.4% coverage — `ensureTmux()`, `getInstallCommand()`, `--force` untested | Low | QA | Install flows exercised only manually |
| W6 | No input validation on `--panes`/`--editor-size` — `--panes abc` silently produces NaN | Low | QA | tmux receives invalid percentages |
| W7 | `remove` silently succeeds for non-existent projects | Low | UX | Misleading output |
| W8 | `set` accepts arbitrary config keys without validation | Low | UX | Typos silently saved |
| W9 | Duplicate code: `readKV`/`readKVFile`, `ensureTmux`/`ensureCommand`, lazygit darwin/linux | Low | Architect | Maintenance burden |
| W10 | Pre-commit hook uses `arch -arm64` — fails on Linux/Intel Macs | Low | DevOps | Contributor friction |
| W11 | Untracked RPI docs and iCloud artifacts in working tree | Low | DevOps | Git noise |
| W12 | Outdated devDeps: vitest 3.x (latest 4.x), eslint, @types/node | Low | Architect | Non-blocking; major version bump needs deliberate upgrade |
| W13 | Invalid layout preset warning doesn't list valid options | Low | UX | Unhelpful error |
| W14 | Help text never mentions `ws` alias | Low | UX | Users of `ws` may not know it's the same tool |

---

## Detailed Findings

### 1. Quality Assurance (qa-lead) — GREEN

- **83 tests, 100% pass rate**, zero type errors, zero lint errors
- Coverage: `completion.ts` 100%, `layout.ts` 100%, `config.ts` 100%/84% branch
- Gap: `index.ts` 0%, `launcher.ts` 67.4% — mostly install flows and CLI dispatch
- No input validation on numeric CLI args (`--panes`, `--editor-size`)

### 2. Security (security-reviewer) — YELLOW

- **No hardcoded secrets**, no `eval()`, no path traversal vulnerabilities
- **All licenses MIT-compatible** (TypeScript is Apache-2.0, compatible)
- 6 devDependency vulns (minimatch, rollup) — don't ship to users
- Command injection surface in `launcher.ts` via `execSync` string interpolation — values come from user config or `.termplex` files. Same trust model as Makefiles.
- Missing `.gitignore` entries for `.npmrc`, `*.pem`, `*.key`

### 3. Infrastructure (devops) — GREEN

- Build succeeds, CI green across Node 18/20/22
- Package metadata complete (name, version, license, bin, files, engines, repo)
- Published package properly scoped to `dist/` only
- Husky pre-commit runs typecheck + lint + test
- Open PR #8 (Dependabot @types/node bump) — non-blocking

### 4. Architecture (architect) — GREEN

- **No circular dependencies** — clean one-directional import graph
- **No dead exports** — all symbols consumed
- **No `any`, `@ts-ignore`, or `@ts-expect-error`** — strict types throughout
- **Zero runtime dependencies** confirmed
- Code duplication in config.ts and launcher.ts (readKV/readKVFile, ensureTmux/ensureCommand)

### 5. Performance (performance-eng) — GREEN

- Bundle: **24.78 KB** (well-sized for a CLI tool)
- Build time: 10ms
- Source map (44.7 KB) included in published package unnecessarily
- Completion strings are 22.3% of bundle — expected for embedded shell scripts
- No unused exports, no dead code in bundle

### 6. UX/CLI (ux-reviewer) — YELLOW (2 blockers)

- `--help`, `--version`, all `completion` subcommands work correctly
- Exit codes consistent (0 success, 1 error) across all commands
- Flag naming consistent (kebab-case, logical short flags)
- **`--no-mouse` crashes** (B1) — documented but not functional
- **Wrong command in error message** (B2) — `config set` vs `set`
- `remove` silent success, `set` no key validation, no `ws` mention in help
