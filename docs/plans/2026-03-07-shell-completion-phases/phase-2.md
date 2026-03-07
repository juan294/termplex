# Phase 2: Documentation Updates

## Scope

Update help text, user manual, and architecture doc to document the new `completion` subcommand and shell setup instructions.

## Files

### MODIFIED: `src/index.ts`

Update the HELP string (lines 14-63) to include the completion subcommand and setup instructions.

```pseudo
// Add to Usage section (after "termplex config" line):
  termplex completion <shell>  Output shell completion script (bash, zsh, fish)

// Add new section after "Per-project config":
Shell completion:
  Bash:  echo 'eval "$(termplex completion bash)"' >> ~/.bashrc
  Zsh:   echo 'eval "$(termplex completion zsh)"' >> ~/.zshrc
  Fish:  termplex completion fish > ~/.config/fish/completions/termplex.fish
```

### MODIFIED: `docs/user-manual.md`

Add a "Shell Completion" section documenting:
- What it does (tab-complete project names, subcommands, flags, layout presets, config keys)
- Setup instructions for bash, zsh, and fish
- Example usage showing `ws <TAB>`, `ws cod<TAB>`, etc.

### MODIFIED: `docs/architecture.md`

Add `completion.ts` to the module map with a brief description of what it exports and how the completion scripts work (file-read approach for dynamic project names).

## Success Criteria (Automated)

```bash
pnpm run typecheck 2>&1    # no errors
pnpm run lint 2>&1         # no errors
pnpm run test 2>&1         # all tests pass
pnpm run build 2>&1        # builds successfully
```

## Success Criteria (Manual)

```bash
# Verify help text includes completion:
./dist/index.js --help | grep -q completion

# Verify completion subcommand shows setup instructions when run without args:
./dist/index.js completion
```
