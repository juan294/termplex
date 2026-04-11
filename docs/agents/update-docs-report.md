# Documentation Update Report

> Generated on 2026-04-11 | Branch: develop | Changes since v0.1.8

## Summary

- 2 documents updated
- 0 diagrams refreshed
- 5 version references corrected (`docs/publishing.md`)
- 0 inline doc blocks updated
- 0 items flagged [NEEDS REVIEW]

## Changes by File

### CHANGELOG.md

Added `[Unreleased]` section documenting all changes since v0.1.8:

- **Added**: architecture diagram, CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md,
  CHANGELOG.md itself, GitHub issue templates, pull request template
- **Changed**: CI matrix updated from Node 18/20/22 to Node 20/22 (Node 18 reached EOL
  April 2025), `engines` bumped to `>=20`, test coverage raised to 100% across all modules,
  dependency updates (vitest v3→v4, eslint, @types/node, typescript-eslint)
- **Security**: flatted DoS fix (Dependabot), 6 additional Dependabot alerts resolved,
  pnpm overrides added for rollup and flatted

Also corrected a stale reference in the v0.1.7 entry: changed "Node 18/20/22 matrix" to
"multi-node matrix" to stay accurate after the matrix change.

### docs/publishing.md

Updated stale version references throughout the pre-publish checklist:

- `engines: ">=18"` → `">=20"` in the "Already Done" checklist
- All three occurrences of `termplex-0.1.0.tgz` → `termplex-0.1.8.tgz`
- `current: 0.1.0` → `current: 0.1.8` in the Version Strategy section
- `git tag v0.1.0` / `git push origin v0.1.0` → `v0.1.8` in the GitHub Release section
- `node-version: 18` → `node-version: 20` in the optional publish workflow snippet

## Flagged for Review

None.

## Pre-existing markdownlint Issues (not introduced by these changes)

The following markdownlint errors exist in the repo but predate this update:

- `CHANGELOG.md:50` — MD013 line-length on the CLI flags list (0.1.7 entry, untouched)
- `CHANGELOG.md:34,42` — MD024 duplicate headings (`### Added` in multiple release sections;
  standard Keep a Changelog pattern)
- Various errors in `CLAUDE.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`,
  `docs/agents/pre-launch-report.md` — all pre-existing
