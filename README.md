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

## Default Layout

```
termplex .    (panes=3, editor=claude, sidebar=lazygit)

┌─────────────────── 75% ───────────────────┬──── 25% ────┐
│                   │                        │             │
│    claude (1)     │    claude (3)          │   lazygit   │
│                   │                        │             │
├───────────────────┤────────────────────────│             │
│                   │                        │             │
│    claude (2)     │    server (plain shell) │             │
│                   │                        │             │
└───────────────────┴────────────────────────┴─────────────┘
      left col             right col            sidebar
```

Editor panes are split across two columns using `ceil(N/2)` left, remainder right. The right column always includes an extra plain shell pane for dev servers.

## Commands

| Command | Description |
|---|---|
| `termplex <target>` | Launch workspace (project name, path, or `.`) |
| `termplex add <name> <path>` | Register a project name to a directory |
| `termplex remove <name>` | Remove a registered project |
| `termplex list` | List all registered projects |
| `termplex set <key> [value]` | Set a machine-level config value |
| `termplex config` | Show current machine configuration |
| `-h, --help` | Show help message |
| `-v, --version` | Show version number |

## Config

| Key | Default | Description |
|---|---|---|
| `editor` | `claude` | Command launched in editor panes |
| `sidebar` | `lazygit` | Command launched in the sidebar pane |
| `panes` | `3` | Number of editor panes |
| `editor-size` | `75` | Width percentage for the editor grid |

Config is stored at `~/.config/termplex/config`. Set values to empty to get a plain shell instead:

```bash
termplex set sidebar        # sidebar becomes a plain shell
termplex set editor vim      # use vim as the editor
termplex set panes 4         # four editor panes
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
