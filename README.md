# termplex

![Chapa Badge](https://chapa.thecreativetoken.com/u/juan294/badge.svg)
[![CI](https://github.com/juan294/termplex/actions/workflows/ci.yml/badge.svg)](https://github.com/juan294/termplex/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/termplex)](https://www.npmjs.com/package/termplex)
[![license](https://img.shields.io/npm/l/termplex)](./LICENSE)

Launch configurable multi-pane terminal workspaces with one command.

## Install

```bash
npm i -g termplex
```

Requires Node >= 18. tmux is installed automatically on first launch if missing (macOS via Homebrew, Linux via apt/dnf/yum/pacman).

## Quick Start

```bash
termplex .                        # launch workspace in current directory
termplex add myapp ~/code/myapp   # register a project
termplex myapp                    # launch by project name
```

## Default Layout (full preset)

```
termplex .    (panes=3, editor=claude, sidebar=lazygit, server=true)

┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│    claude (1)     │    claude (3)          │   lazygit   │
│                   │                        │             │
├───────────────────┤────────────────────────│             │
│                   │                        │             │
│    claude (2)     │    server (shell)      │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

## Layout Presets

| Preset | Panes | Server | Use case |
|---|---|---|---|
| `full` | 3 | yes | Default -- multi-agent coding + dev server |
| `pair` | 2 | yes | Two editors + dev server |
| `minimal` | 1 | no | Simple editor + sidebar only |
| `cli` | 1 | yes | CLI tool development -- editor + npm login |

```bash
termplex . --layout minimal       # 1 editor pane, no server
termplex . -l pair                # 2 editors + server
```

## Per-project Config

Drop a `.termplex` file in your project root to override machine-level config:

```ini
# .termplex
layout=minimal
editor=vim
server=npm run dev
```

Config resolution order: **CLI flags > .termplex > machine config > preset > defaults**

## Commands

| Command | Description |
|---|---|
| `termplex <target>` | Launch workspace (project name, path, or `.`) |
| `termplex add <name> <path>` | Register a project name to a directory |
| `termplex remove <name>` | Remove a registered project |
| `termplex list` | List all registered projects |
| `termplex set <key> [value]` | Set a machine-level config value |
| `termplex config` | Show current machine configuration |

## CLI Flags

| Flag | Description |
|---|---|
| `-l, --layout <preset>` | Use a layout preset (`minimal`, `full`, `pair`, `cli`) |
| `-f, --force` | Kill existing session and recreate it |
| `--editor <cmd>` | Override editor command |
| `--panes <n>` | Override number of editor panes |
| `--editor-size <n>` | Override editor width percentage |
| `--sidebar <cmd>` | Override sidebar command |
| `--server <value>` | Server pane: `true`, `false`, or a command |
| `-h, --help` | Show help message |
| `-v, --version` | Show version number |

## Config Keys

| Key | Default | Description |
|---|---|---|
| `editor` | `claude` | Command launched in editor panes |
| `sidebar` | `lazygit` | Command launched in the sidebar pane |
| `panes` | `3` | Number of editor panes |
| `editor-size` | `75` | Width percentage for the editor grid |
| `server` | `true` | Server pane: `true` (shell), `false` (none), or a command |
| `layout` | | Default layout preset |

Machine config is stored at `~/.config/termplex/config`:

```bash
termplex set editor vim           # use vim as the editor
termplex set server "npm run dev" # run dev server automatically
termplex set layout minimal       # default to minimal preset
```

## Alias

termplex is also available as `ws` for quick access:

```bash
ws .
ws myapp
```

## Docs

- [Architecture](docs/architecture.md) -- module map, layout algorithm, build pipeline
- [User Manual](docs/user-manual.md) -- full command reference, walkthrough, troubleshooting
- [Publishing](docs/publishing.md) -- npm publish checklist

## License

[MIT](./LICENSE)
