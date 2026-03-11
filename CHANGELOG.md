# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md
- CHANGELOG.md
- GitHub issue templates (bug report, feature request)
- Pull request template

## [0.1.8] - 2026-03-10

### Added

- Shell completion support (bash, zsh, fish)
- CodeQL security scanning workflow
- Dependency review workflow for PRs

## [0.1.7] - 2026-03-09

### Added

- Initial public release
- CLI entry point with subcommand dispatch (launch, add, remove, list, set, config)
- Config system: machine-level (`~/.config/termplex/`) and per-project (`.termplex`)
- Layout planner with 5 presets: minimal, full, pair, cli, mtop
- tmux session builder with split management
- Auto-install prompts for missing commands (tmux, claude, lazygit)
- CLI flags: `--layout`, `--force`, `--editor`, `--panes`, `--editor-size`, `--sidebar`, `--server`, `--mouse`/`--no-mouse`
- Config resolution order: CLI > project > machine > preset > defaults
- CI pipeline with Node 18/20/22 matrix
- Dependabot for npm and GitHub Actions

[Unreleased]: https://github.com/juan294/termplex/compare/v0.1.8...HEAD
[0.1.8]: https://github.com/juan294/termplex/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/juan294/termplex/releases/tag/v0.1.7
