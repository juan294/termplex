# Research: Shell Tab Completion for Termplex

**Date:** 2026-03-07
**Question:** Can termplex support shell tab completion for project names and subcommands?

## Current State

Termplex has **no shell completion support**. No completion files, no subcommand, no documentation about it exist anywhere in the project.

### What Exists Today

| Component | Location | Details |
|-----------|----------|---------|
| Binary names | `package.json:8-9` | `termplex` and `ws` |
| Subcommands | `src/index.ts:116-211` | `add`, `remove`, `list`, `set`, `config`, plus default launch target |
| CLI flags | `src/index.ts:70-84` | `--help`, `--version`, `--force`, `--layout`, `--editor`, `--panes`, `--editor-size`, `--sidebar`, `--server`, `--mouse`/`--no-mouse` |
| Project storage | `src/config.ts:6` | `~/.config/termplex/projects` (key=value lines) |
| Config storage | `src/config.ts:7` | `~/.config/termplex/config` (key=value lines) |
| Arg parser | `src/index.ts:1` | `node:util` `parseArgs` — has **no** built-in completion support |
| Layout presets | `src/index.ts:29` | `minimal`, `full`, `pair`, `cli`, `mtop` |
| Config keys | `src/index.ts:38-44` | `editor`, `sidebar`, `panes`, `editor-size`, `server`, `mouse`, `layout` |

### Project Name Resolution Flow

When the user runs `ws myproject` (`src/index.ts:177-197`):
1. `subcommand` is set to `"myproject"` (`src/index.ts:109`)
2. Falls through to the `default` case (`src/index.ts:177`)
3. Checks if target is `.`, absolute/home path, or a project name
4. Calls `getProject(target)` (`src/config.ts:63-65`) which reads `~/.config/termplex/projects`
5. If not found, prints error with suggestions (`src/index.ts:189-193`)

### Data Available for Completion

| Completable Item | Source | Dynamic? |
|-----------------|--------|----------|
| Registered project names | `~/.config/termplex/projects` | Yes — changes when user runs `add`/`remove` |
| Subcommands (`add`, `remove`, `list`, `set`, `config`) | Hardcoded in `src/index.ts:116-175` | No |
| CLI flags | Hardcoded in `src/index.ts:70-84` | No |
| Layout presets (`minimal`, `full`, `pair`, `cli`, `mtop`) | Hardcoded | No |
| Config keys (`editor`, `sidebar`, etc.) | Hardcoded | No |

---

## Shell Completion Mechanisms

### How Shells Handle Completion

**Bash:**
- Uses `complete -F function_name command_name` to register a completion function
- When the user presses Tab, bash sets `COMP_LINE`, `COMP_POINT`, `COMP_WORDS`, `COMP_CWORD` environment variables
- The function populates the `COMPREPLY` array using `compgen -W "wordlist" -- "$current_word"`
- Installation: source script in `~/.bashrc` or place in `~/.local/share/bash-completion/completions/`

**Zsh:**
- Uses `compdef _function_name command_name` to register completion
- `_arguments` utility defines option and argument specs declaratively
- Can call external commands for dynamic data via `$(command)` substitution
- Installation: add to `FPATH` or `~/.oh-my-zsh/completions/`

**Fish:**
- Uses `complete -c command_name -a "choices"` declaratively
- Dynamic completions via command substitution: `-a '(command)'`
- Conditional completions via `-n "condition"` with helpers like `__fish_seen_subcommand_from`
- Installation: place in `~/.config/fish/completions/command.fish`

### Common CLI Pattern: The Completion Subcommand

Major CLI tools (Docker, npm, pnpm) expose a `completion` subcommand:

```bash
docker completion bash    # outputs bash completion script
npm completion            # outputs bash completion script
pnpm completion bash      # outputs bash completion script
```

Users install by piping output to their shell config:
```bash
eval "$(mytool completion bash)"     # in .bashrc
mytool completion zsh > ~/.zsh/completions/_mytool   # for zsh
mytool completion fish > ~/.config/fish/completions/mytool.fish  # for fish
```

### Dynamic Completion Callback Pattern

For data that changes at runtime (like project names), the generated completion script **calls back into the CLI tool**:

1. Shell script detects Tab press and captures context (current word, previous word, full line)
2. Script calls: `mytool --get-completions [context]` or reads data directly
3. Tool outputs matching completions to stdout, one per line
4. Shell displays matches to user

Two approaches for dynamic data:
- **Callback approach**: Completion script invokes the CLI binary each time Tab is pressed. More flexible, always up-to-date, but adds latency.
- **File-read approach**: Completion script reads `~/.config/termplex/projects` directly using shell builtins (`awk`, `cut`). Faster, no Node.js startup overhead, but duplicates parsing logic.

### Zero-Dependency Implementation

Self-contained completion for tools without external deps:
1. Tool implements `completion [bash|zsh|fish]` subcommand
2. Subcommand outputs a hardcoded shell script with embedded logic
3. Dynamic data (project names) can be fetched by:
   - The script reading the projects file directly (faster)
   - The script calling back into the tool (more maintainable)
4. No npm dependencies are needed — the completion scripts are pure shell code

### `parseArgs` and Completion

Node.js `util.parseArgs()` has no built-in completion support. Completion must be implemented separately by the CLI author. This is the same situation as every other minimal argument parser.

---

## Relevant Completion Contexts for Termplex

Based on the current CLI structure, here are the completion scenarios:

### Position 1: After `ws` or `termplex`
Completions: all subcommands (`add`, `remove`, `list`, `set`, `config`) + all registered project names + `.`

### Position 2+: Context-dependent
| After... | Completions |
|----------|-------------|
| `add` | (no completion — user provides new name) |
| `remove` | registered project names |
| `set` | config keys (`editor`, `sidebar`, `panes`, `editor-size`, `server`, `mouse`, `layout`) |
| `--layout` / `-l` | layout presets (`minimal`, `full`, `pair`, `cli`, `mtop`) |
| Any flag expecting value | depends on the flag |
| `set layout` | layout presets |

### Global flags (any position)
`-h`, `--help`, `-v`, `--version`, `-f`, `--force`, `-l`, `--layout`, `--editor`, `--panes`, `--editor-size`, `--sidebar`, `--server`, `--mouse`, `--no-mouse`

---

## Summary

Shell tab completion is a well-established pattern for CLI tools. The standard approach is:
1. Add a `completion` subcommand that outputs shell-specific scripts
2. Scripts handle static completions (subcommands, flags) inline
3. Scripts handle dynamic completions (project names) by reading the projects file or calling back into the tool
4. Users install by sourcing the output in their shell config
5. No runtime dependencies are needed — completion scripts are pure shell code

The termplex projects file at `~/.config/termplex/projects` uses a simple `key=value` format that is trivially parseable by shell builtins (`cut -d= -f1`), making the file-read approach particularly suitable for fast, zero-overhead project name completion.
