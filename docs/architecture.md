# Architecture

Technical reference for contributors.

## Module Map

```
src/
  index.ts       CLI entry point — parseArgs, subcommand dispatch, CLI overrides
  config.ts      Config file read/write (~/.config/termplex/ and .termplex)
  layout.ts      Layout calculation, presets (pure functions, no side effects)
  launcher.ts    Config resolution, tmux session builder (side-effectful)
  globals.d.ts   Build-time constant declarations (__VERSION__)
  *.test.ts      Co-located unit tests (vitest)
```

### Dependency Graph

```
index.ts
  ├── config.ts   (addProject, removeProject, getProject, listProjects, setConfig, listConfig)
  └── launcher.ts (launch, CLIOverrides)
        ├── config.ts   (getConfig, readKVFile)
        └── layout.ts   (planLayout, isPresetName, getPreset, LayoutOptions, LayoutPlan)
```

`layout.ts` is a pure module with no imports from the project. `config.ts` only uses Node stdlib. `launcher.ts` depends on both.

## Data Flow

```
CLI invocation
  → node:util parseArgs
      flags: --help, --version, --layout, --editor, --panes, --editor-size, --sidebar, --server
      positionals: subcommand + args
  → subcommand dispatch (switch/case)
      ├── add/remove/list/set/config → config.ts read/write
      └── default (launch target)
            → resolve target directory (., absolute path, or project name lookup)
            → build CLIOverrides from parsed flags
            → launcher.launch(targetDir, cliOverrides)
                → ensureTmux() — install if missing
                → resolveConfig(targetDir, cliOverrides)
                    → readKVFile(targetDir/.termplex)  — project config
                    → resolve layout key (CLI > project > global)
                    → expand preset if layout is a valid preset name
                    → layer each key: CLI > project > global > preset
                → planLayout(resolvedOpts) — compute pane counts and sizes
                → ensureCommand() for editor, sidebar, serverCommand
                → check for existing session → attach if found
                → buildSession(sessionName, targetDir, plan)
                    → create tmux session + split panes
                → attach to new session
```

## Config Resolution

`resolveConfig()` in `launcher.ts` merges configuration from multiple sources:

```
CLI flags  >  .termplex  >  ~/.config/termplex/config  >  preset expansion  >  built-in defaults
(highest)                                                                        (lowest)
```

1. Read project `.termplex` file via `readKVFile(join(targetDir, ".termplex"))`
2. Resolve the `layout` key (CLI > project > global) and expand the matching preset as a base
3. For each config key (`editor`, `sidebar`, `panes`, `editor-size`, `server`), pick the highest-priority value: CLI > project > global > preset
4. Return partial `LayoutOptions` — `planLayout()` fills remaining defaults

## Layout Presets

Defined in `layout.ts` as a `Record<PresetName, Partial<LayoutOptions>>`:

| Preset | `editorPanes` | `server` |
|---|---|---|
| `minimal` | 1 | `"false"` |
| `full` | 3 | `"true"` |
| `pair` | 2 | `"true"` |

`isPresetName(value)` is a type guard. `getPreset(name)` returns the partial options. Presets only set `editorPanes` and `server`; all other keys fall through to higher-priority sources or defaults.

## Layout Algorithm

Given `N` editor panes (default 3) and server toggle:

1. **Left column**: `ceil(N/2)` editor panes
2. **Right column**: `N - ceil(N/2)` editor panes + (1 server pane if `hasServer`)
3. **Sidebar**: separate column at `100 - editorSize`% width

### Server Pane

`parseServer(value)` in `layout.ts` interprets the `server` config key:

| Input | `hasServer` | `serverCommand` |
|---|---|---|
| `"true"` | `true` | `null` (plain shell) |
| `"false"` or `""` | `false` | `null` |
| anything else | `true` | the input string |

When `hasServer` is false, the right column contains only editor panes (no extra split).

### Split Percentage Formula

When splitting `N` panes into a column, each split uses:

```
pct(i) = floor((N - i) / (N - i + 1) * 100)
```

where `i` is the 1-based index of the split. This produces equal-height panes. For 2 panes: the first split is 50%. For 3 panes: splits are 66%, then 50%.

### Examples

**full / panes=3** (default):
- Left column: 2 editor panes (ceil(3/2) = 2)
- Right column: 1 editor pane + 1 server pane

**pair / panes=2**:
- Left column: 1 editor pane
- Right column: 1 editor pane + 1 server pane

**minimal / panes=1**:
- Left column: 1 editor pane
- Right column: empty (no server pane)

## tmux Session Construction

`buildSession()` in `launcher.ts` receives a pre-computed `LayoutPlan` and executes:

1. **Create session**: `tmux new-session -d -s "tp-<dirname>" -c <dir>`
2. **Capture root pane**: `tmux display -t "tp-<dirname>:0" -p "#{pane_id}"`
3. **Split sidebar**: horizontal split from root pane at `sidebarSize`%, run sidebar command
4. **Split right column**: horizontal split from root pane at 50%, run editor command — this becomes the first right-column pane
5. **Split left column**: vertical splits from root pane for additional left-column panes (i=1..leftColumnCount-1), each running the editor
6. **Split right column panes**: vertical splits from right column pane for additional right-column editor panes + optional server pane (conditional on `hasServer`)
7. **Respawn root pane**: replace the plain shell in root pane with the editor command
8. **Focus root pane**: `tmux select-pane -t <rootId>`

### Session Naming

Session names use the format `tp-<sanitized-dirname>`, where the directory basename is sanitized to `[a-zA-Z0-9_-]` (other characters replaced with `_`).

### Re-attach Behavior

If a session named `tp-<dirname>` already exists, termplex attaches to it instead of creating a new one.

## Config Storage

### Machine-level

Config files live at `~/.config/termplex/`:

| File | Purpose |
|---|---|
| `config` | Machine-level settings (editor, sidebar, panes, editor-size, server, layout) |
| `projects` | Project name-to-path mappings |

Both use `key=value` format, one entry per line. The first `=` is the delimiter (values may contain `=`). Files are created automatically on first access, with `config` seeded with `editor=claude`.

### Per-project

A `.termplex` file in the project root uses the same `key=value` format. Read by `readKVFile()` — a standalone parser that does not trigger `ensureConfig()` side effects.

## Build Pipeline

1. **tsup** compiles `src/index.ts` to `dist/index.js` (ESM, target node18)
2. **Shebang injection**: `#!/usr/bin/env node` banner prepended
3. **Version injection**: `__VERSION__` replaced with `package.json` version at build time via `define`
4. **Source maps**: generated alongside the bundle
5. **prepublishOnly**: runs `pnpm run build` before any `npm publish`

The `files` field in package.json limits the published package to `dist/` only.
