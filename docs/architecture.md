# Architecture

Technical reference for contributors.

## Module Map

```
src/
  index.ts       CLI entry point — parseArgs, subcommand dispatch
  config.ts      Config file read/write (~/.config/termplex/)
  layout.ts      Layout calculation (pure function, no side effects)
  launcher.ts    tmux session builder (side-effectful, calls execSync)
  globals.d.ts   Build-time constant declarations (__VERSION__)
  *.test.ts      Co-located unit tests (vitest)
```

### Dependency Graph

```
index.ts
  ├── config.ts   (addProject, removeProject, getProject, listProjects, setConfig, listConfig)
  └── launcher.ts
        ├── config.ts   (getConfig)
        └── layout.ts   (planLayout)
```

`layout.ts` is a pure module with no imports from the project. `config.ts` only uses Node stdlib. `launcher.ts` depends on both.

## Data Flow

```
CLI invocation
  → node:util parseArgs (flags: --help, --version; positionals: subcommand + args)
  → subcommand dispatch (switch/case)
      ├── add/remove/list/set/config → config.ts read/write
      └── default (launch target)
            → resolve target directory (., absolute path, or project name lookup)
            → launcher.launch(targetDir)
                → ensureTmux() — install if missing
                → check for existing session → attach if found
                → buildSession()
                    → read config values (editor, sidebar, panes, editor-size)
                    → planLayout() — compute pane counts and sizes
                    → create tmux session + split panes
                → attach to new session
```

## Layout Algorithm

Given `N` editor panes (default 3):

1. **Left column**: `ceil(N/2)` editor panes
2. **Right column**: `N - ceil(N/2)` editor panes + 1 server pane (plain shell)
3. **Sidebar**: separate column at `100 - editorSize`% width

### Split Percentage Formula

When splitting `N` panes into a column, each split uses:

```
pct(i) = floor((N - i) / (N - i + 1) * 100)
```

where `i` is the 1-based index of the split. This produces equal-height panes. For 2 panes: the first split is 50%. For 3 panes: splits are 66%, then 50%.

### Examples

**panes=3** (default):
- Left column: 2 editor panes (ceil(3/2) = 2)
- Right column: 1 editor pane + 1 server pane

**panes=4**:
- Left column: 2 editor panes (ceil(4/2) = 2)
- Right column: 2 editor panes + 1 server pane

## tmux Session Construction

`buildSession()` in `launcher.ts` executes these steps:

1. **Create session**: `tmux new-session -d -s "tp-<dirname>" -c <dir>`
2. **Capture root pane**: `tmux display -t "tp-<dirname>:0" -p "#{pane_id}"`
3. **Split sidebar**: horizontal split from root pane at `sidebarSize`%, run sidebar command
4. **Split right column**: horizontal split from root pane at 50%, run editor command — this becomes the first right-column pane
5. **Split left column**: vertical splits from root pane for additional left-column panes (i=1..leftColumnCount-1), each running the editor
6. **Split right column panes**: vertical splits from right column pane for additional right-column editor panes + 1 server pane (plain shell)
7. **Respawn root pane**: replace the plain shell in root pane with the editor command
8. **Focus root pane**: `tmux select-pane -t <rootId>`

### Session Naming

Session names use the format `tp-<sanitized-dirname>`, where the directory basename is sanitized to `[a-zA-Z0-9_-]` (other characters replaced with `_`).

### Re-attach Behavior

If a session named `tp-<dirname>` already exists, termplex attaches to it instead of creating a new one.

## Config Storage

Config files live at `~/.config/termplex/`:

| File | Purpose |
|---|---|
| `config` | Machine-level settings (editor, sidebar, panes, editor-size) |
| `projects` | Project name-to-path mappings |

Both use a simple `key=value` format, one entry per line. The first `=` is the delimiter (values may contain `=`). Files are created automatically on first access, with `config` seeded with `editor=claude`.

## Build Pipeline

1. **tsup** compiles `src/index.ts` to `dist/index.js` (ESM, target node18)
2. **Shebang injection**: `#!/usr/bin/env node` banner prepended
3. **Version injection**: `__VERSION__` replaced with `package.json` version at build time via `define`
4. **Source maps**: generated alongside the bundle
5. **prepublishOnly**: runs `pnpm run build` before any `npm publish`

The `files` field in package.json limits the published package to `dist/` only.
