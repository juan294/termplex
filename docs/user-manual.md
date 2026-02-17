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

### Flags

| Flag | Description |
|---|---|
| `-h`, `--help` | Show help message |
| `-v`, `--version` | Show version number |

## Config Reference

| Key | Type | Default | Description |
|---|---|---|---|
| `editor` | string | `claude` | Command launched in each editor pane. Set to empty for a plain shell. |
| `sidebar` | string | `lazygit` | Command launched in the sidebar pane. Set to empty for a plain shell. |
| `panes` | integer | `3` | Number of editor panes. |
| `editor-size` | integer | `75` | Width percentage allocated to the editor grid (left side). The sidebar gets the remainder. |

Config is stored at `~/.config/termplex/config` in `key=value` format.

Project mappings are stored at `~/.config/termplex/projects`.

## Layout Diagrams

### panes=3 (default)

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

## The `ws` Alias

termplex ships a second binary name `ws` that behaves identically:

```bash
ws .
ws myapp
ws set editor vim
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

If you run `termplex .` and a session for that directory already exists, termplex attaches to it. To start fresh, kill the existing session first:

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

- Reduce the number of panes: `termplex set panes 2`
- Increase terminal window size
- Reduce sidebar width: `termplex set editor-size 80`

### Editor command not found

If your configured editor isn't on PATH, the pane will show an error and fall back to the shell (`exec $SHELL`). Fix by either:

- Installing the editor
- Updating the config: `termplex set editor <command-on-path>`

### Config file location

All config files are at `~/.config/termplex/`:

```
~/.config/termplex/
  config      machine-level settings
  projects    project name → path mappings
```

Files are plain text (`key=value` format) and safe to edit manually.
