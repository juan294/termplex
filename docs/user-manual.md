# User Manual

Complete usage reference for termplex.

## Prerequisites

- **Node.js >= 18**
- **tmux** -- installed automatically on first launch if missing
  - macOS: via Homebrew (`brew install tmux`)
  - Linux: via apt-get, dnf, yum, or pacman (auto-detected)
  - If no supported package manager is found, you'll be asked to install tmux manually

## Installation

```bash
npm i -g termplex
```

This installs two commands: `termplex` and `ws` (a shorter alias).

## Updating

To update termplex to the latest version, re-run the install command:

```bash
npm i -g termplex
```

You can check your current version at any time with:

```bash
termplex --version
```

## First Launch Walkthrough

```bash
# 1. Navigate to your project
cd ~/code/myapp

# 2. Launch a workspace
termplex .

# 3. You're now in a tmux session with:
#    - 3 editor panes running 'claude'
#    - 1 server pane (plain shell for dev servers)
#    - 1 sidebar pane running 'lazygit'

# 4. Navigate between panes
#    Ctrl-b + arrow keys   (default tmux bindings)
#    Ctrl-b + q             show pane numbers, then press a number

# 5. Detach from the session
#    Ctrl-b + d

# 6. Re-attach later
termplex .
#    (automatically re-attaches to the existing session)
```

## Command Reference

### `termplex <target>`

Launch a workspace. The target can be:

- `.` -- current directory
- An absolute path (`/home/user/project`) or home-relative path (`~/project`)
- A registered project name (see `termplex add`)

If a session for that directory already exists, termplex attaches to it.

```bash
termplex .
termplex ~/code/myapp
termplex myapp
```

### `termplex add <name> <path>`

Register a project name mapped to a directory path. Paths support `~` expansion.

```bash
termplex add myapp ~/code/myapp
termplex add api ~/code/backend/api
```

### `termplex remove <name>`

Remove a registered project.

```bash
termplex remove myapp
```

### `termplex list`

List all registered projects.

```bash
$ termplex list
Registered projects:
  myapp → /Users/juan/code/myapp
  api → /Users/juan/code/backend/api
```

### `termplex set <key> [value]`

Set a machine-level config value. Omit the value to reset to a plain shell.

```bash
termplex set editor vim       # use vim instead of claude
termplex set sidebar          # sidebar becomes a plain shell
termplex set panes 4          # four editor panes
termplex set editor-size 80   # editor grid takes 80% width
termplex set server false     # disable the server pane
termplex set server "npm run dev"  # run a command in the server pane
termplex set mouse false      # disable mouse mode
termplex set layout minimal   # default to the minimal preset
```

### `termplex config`

Show current machine configuration.

```bash
$ termplex config
Machine config:
  editor → claude
  sidebar → lazygit
  panes → 3
  editor-size → 75
```

### CLI Flags

Flags override both machine and per-project config for a single launch.

| Flag | Description |
|---|---|
| `-l`, `--layout <preset>` | Use a layout preset (`minimal`, `full`, `pair`, `cli`) |
| `--editor <cmd>` | Override editor command |
| `--panes <n>` | Override number of editor panes |
| `--editor-size <n>` | Override editor width percentage |
| `--sidebar <cmd>` | Override sidebar command |
| `--server <value>` | Server pane: `true`, `false`, or a command |
| `--mouse` / `--no-mouse` | Enable/disable tmux mouse mode (default: on) |
| `-f`, `--force` | Kill existing session and recreate it |
| `-h`, `--help` | Show help message |
| `-v`, `--version` | Show version number |

```bash
termplex . --layout minimal
termplex . -l pair --server "npm run dev"
termplex . --editor vim --panes 2
termplex . --no-mouse           # launch without mouse mode
termplex . --force              # recreate an existing session
termplex . -f -l minimal        # recreate with a different layout
```

## Layout Presets

Presets are named shortcuts for common layout configurations.

| Preset | Editor panes | Server pane | Description |
|---|---|---|---|
| `full` | 3 | yes (shell) | Default -- multi-agent coding + dev server |
| `pair` | 2 | yes (shell) | Two editors + dev server |
| `minimal` | 1 | no | Simple editor + sidebar |
| `cli` | 1 | yes (`npm login`) | CLI tool development -- editor + npm login |

Use a preset via CLI flag, per-project config, or machine config:

```bash
# CLI flag (one-time)
termplex . --layout minimal

# Per-project config (in .termplex)
layout=minimal

# Machine config (persistent default)
termplex set layout pair
```

Individual keys override preset values. For example, `--layout minimal --server true` gives you 1 editor pane but keeps the server pane.

## Server Pane

The server pane sits at the bottom of the right column. It supports three modes:

| Value | Behavior |
|---|---|
| `true` (default) | Plain shell -- you run commands manually |
| `false` or empty | No server pane at all |
| Any other string | Runs that command automatically (e.g. `npm run dev`) |

```bash
# Disable the server pane
termplex . --server false

# Run a dev server automatically
termplex . --server "npm run dev"

# Persistent config
termplex set server "python -m http.server"
```

## Per-project Config

Place a `.termplex` file in your project root to override machine-level config for that project. The file uses the same `key=value` format:

```ini
# ~/code/myapp/.termplex
layout=pair
server=npm run dev
```

```ini
# ~/code/cli-tool/.termplex
layout=minimal
editor=vim
```

### Config Resolution Order

When termplex launches, config values are resolved in this order (first wins):

1. **CLI flags** (`--layout`, `--editor`, etc.)
2. **Project config** (`.termplex` in the target directory)
3. **Machine config** (`~/.config/termplex/config`)
4. **Preset expansion** (if a `layout` key resolved above)
5. **Built-in defaults** (`editor=claude`, `panes=3`, etc.)

This means CLI flags always win, project config overrides machine config, and presets provide a base that individual keys can override.

## Config Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `editor` | string | `claude` | Command launched in each editor pane. Set to empty for a plain shell. |
| `sidebar` | string | `lazygit` | Command launched in the sidebar pane. Set to empty for a plain shell. |
| `panes` | integer | `3` | Number of editor panes. |
| `editor-size` | integer | `75` | Width percentage allocated to the editor grid. The sidebar gets the remainder. |
| `server` | string | `true` | Server pane toggle: `true` (shell), `false` (none), or a command to run. |
| `mouse` | string | `true` | Enable tmux mouse mode: `true` (on) or `false` (off). |
| `layout` | string | | Default layout preset (`minimal`, `full`, `pair`, or `cli`). |

Machine config: `~/.config/termplex/config`
Project config: `.termplex` (in project root)
Project mappings: `~/.config/termplex/projects`

All files use `key=value` format, one entry per line.

## Layout Diagrams

### full preset / panes=3 (default)

```
┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│    editor (1)     │    editor (3)          │   sidebar   │
│                   │                        │             │
├───────────────────┤────────────────────────│             │
│                   │                        │             │
│    editor (2)     │    server (shell)      │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

- Left column: `ceil(3/2) = 2` editor panes
- Right column: `3 - 2 = 1` editor pane + 1 server pane

### pair preset / panes=2

```
┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│                   │    editor (2)          │             │
│    editor (1)     │                        │   sidebar   │
│                   ├────────────────────────│             │
│                   │                        │             │
│                   │    server (shell)      │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

- Left column: 1 editor pane
- Right column: 1 editor pane + 1 server pane

### minimal preset / panes=1

```
┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│                   │                        │             │
│                   │                        │             │
│    editor (1)     │    (right col empty)   │   sidebar   │
│                   │                        │             │
│                   │                        │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

- Left column: 1 editor pane
- Right column: empty (no server pane in minimal)

### cli preset / panes=1

```
┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│                   │                        │             │
│                   │                        │             │
│    editor (1)     │    npm login           │   lazygit   │
│                   │                        │             │
│                   │                        │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

- Left column: 1 editor pane
- Right column: server pane running `npm login`

### panes=4

```
┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│    editor (1)     │    editor (3)          │             │
│                   │                        │             │
├───────────────────┤────────────────────────│   sidebar   │
│                   │    editor (4)          │             │
│    editor (2)     │                        │             │
│                   ├────────────────────────│             │
│                   │    server (shell)      │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

- Left column: `ceil(4/2) = 2` editor panes
- Right column: `4 - 2 = 2` editor panes + 1 server pane

## Terminal Tab Titles

termplex automatically sets the terminal tab title to the project directory name. If your project folder is `myapp`, the tab will display **myapp** instead of the default shell name (e.g. "zsh").

This works with Ghostty, iTerm2, WezTerm, kitty, and other terminals that support tmux title propagation. termplex configures tmux's `set-titles` option each time it attaches to a session.

## The `ws` Alias

termplex ships a second binary name `ws` that behaves identically:

```bash
ws .
ws myapp
ws set editor vim
ws . --layout minimal
```

## Troubleshooting

### tmux is not installed

termplex auto-detects your package manager and offers to install tmux. If it can't find a supported package manager, install tmux manually:

```bash
# macOS
brew install tmux

# Debian/Ubuntu
sudo apt-get install -y tmux

# Fedora
sudo dnf install -y tmux

# Arch
sudo pacman -S tmux
```

### Session already exists

If you run `termplex .` and a session for that directory already exists, termplex attaches to it. To recreate the session with a new layout, use the `--force` flag:

```bash
termplex . --force
termplex . -f -l minimal
```

You can also kill the session manually:

```bash
tmux kill-session -t tp-myapp
termplex .
```

### Unknown project name

```
Unknown project: myapp
Register it with: termplex add myapp /path/to/project
Or see available:  termplex list
```

Register the project with `termplex add` or use a direct path instead.

### Panes too small

If tmux reports panes are too small, try:

- Reduce the number of panes: `termplex set panes 2` or `--layout minimal`
- Increase terminal window size
- Reduce sidebar width: `termplex set editor-size 80`

### Editor command not found

If your configured editor isn't on PATH, termplex will offer to install it (for known commands like `claude` and `lazygit`) or exit with an error. Fix by either:

- Installing the command
- Updating the config: `termplex set editor <command-on-path>`

### Config file location

All config files are at `~/.config/termplex/`:

```
~/.config/termplex/
  config      machine-level settings
  projects    project name → path mappings
```

Per-project config lives in your project root as `.termplex`.

Files are plain text (`key=value` format) and safe to edit manually.
