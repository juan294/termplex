# Publishing Checklist

Tracking what's done and what's left before the first `npm publish`.

## Already Done

- [x] Package name `termplex` available on npm
- [x] `bin` entries for `termplex` and `ws`
- [x] `files: ["dist"]` limits published contents
- [x] `engines: { "node": ">=18" }`
- [x] `prepublishOnly` runs `pnpm run build`
- [x] `license: "MIT"` + LICENSE file
- [x] Zero runtime dependencies
- [x] CI pipeline (typecheck + build + test)
- [x] `keywords` for npm discoverability
- [x] `repository`, `homepage`, `bugs` fields in package.json

## TODO Before First Publish

### 1. README.md
- [x] Created (this PR)

### 2. npm Account
- [ ] Create npm account or verify existing one
- [ ] Run `npm login`

### 3. Local Tarball Test
```bash
pnpm pack
# Inspect the tarball contents:
tar tzf termplex-0.1.0.tgz
# Should contain: package/dist/index.js, package/package.json,
#                 package/README.md, package/LICENSE
# Should NOT contain: docs/, src/, node_modules/

# Install globally from the tarball:
npm i -g ./termplex-0.1.0.tgz

# Verify both commands work:
termplex --version
ws --version
termplex --help

# Test a real launch:
termplex .

# Clean up:
npm uninstall -g termplex
rm termplex-0.1.0.tgz
```

### 4. Clean Machine Test
- [ ] Test on another computer, VM, or Docker container
- [ ] Verify tmux auto-install prompt works
- [ ] Verify the full launch flow

### 5. Version Strategy
- `0.x.y` while pre-stable (current: `0.1.0`)
- `1.0.0` when the CLI is stable and API won't change
- Follow semver: breaking changes = major, features = minor, fixes = patch

### 6. Publish
```bash
# Dry run first:
npm publish --dry-run

# If everything looks good:
npm publish

# Verify it's live:
npm info termplex
```

### 7. Post-Publish Verification
```bash
# Install from npm on a clean machine:
npm i -g termplex
termplex --version
ws --help
termplex .
```

### 8. GitHub Release
- [ ] Tag the commit: `git tag v0.1.0`
- [ ] Push the tag: `git push origin v0.1.0`
- [ ] Create a GitHub release from the tag

## Ongoing Release Process

1. Make changes on a feature branch
2. Merge to `main`
3. Bump version in `package.json`
4. `pnpm typecheck && pnpm build && pnpm test`
5. `git commit` the version bump
6. `git tag v<version>`
7. `npm publish`
8. `git push origin main --tags`
9. Create GitHub release

## Optional: Automated Publish

A GitHub Actions workflow could automate publishing on version tags:

```yaml
# .github/workflows/publish.yml
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          registry-url: https://registry.npmjs.org
      - run: corepack enable && pnpm install
      - run: pnpm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Requires adding `NPM_TOKEN` to repository secrets.
