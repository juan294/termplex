# Phase 1: Completion Module + CLI Wiring + Tests

## Scope

Create `src/completion.ts` with bash, zsh, and fish completion script generators. Wire into CLI as a new `completion` subcommand. Add co-located tests.

## Files

### NEW: `src/completion.ts`

Pure functions that return shell completion scripts as strings.

```pseudo
export function bashCompletion(): string {
  // Returns a bash script string containing:
  // - _termplex_completions() function
  // - Reads project names dynamically: cut -d= -f1 ~/.config/termplex/projects
  // - Static word lists for subcommands, flags, config keys, layout presets
  // - Context-aware completion:
  //   - Position 1: subcommands + project names + "."
  //   - After "remove": project names
  //   - After "set": config keys
  //   - After "set layout" or "--layout"/"-l": layout presets
  //   - After flags needing values (--editor, --panes, etc.): no completion (user-provided)
  //   - Otherwise: flags
  // - Registers with: complete -F _termplex_completions termplex ws
}

export function zshCompletion(): string {
  // Returns a zsh script string containing:
  // - _termplex() function using _arguments or manual case matching
  // - Reads project names dynamically from projects file
  // - Same context-aware logic as bash
  // - Registers with: compdef _termplex termplex ws
}

export function fishCompletion(): string {
  // Returns a fish script string containing:
  // - Declarative complete -c statements for both termplex and ws
  // - Dynamic project names via command substitution: (cut -d= -f1 ~/.config/termplex/projects)
  // - Conditional completions using __fish_seen_subcommand_from
  // - --no-files where appropriate (subcommands, flags)
}
```

#### Completion Data (embedded as string literals in the generated scripts)

```
SUBCOMMANDS = "add remove list set config completion"
FLAGS_LONG  = "--help --version --force --layout --editor --panes --editor-size --sidebar --server --mouse --no-mouse"
FLAGS_SHORT = "-h -v -f -l"
CONFIG_KEYS = "editor sidebar panes editor-size server mouse layout"
PRESETS     = "minimal full pair cli mtop"
```

#### Dynamic Project Names (shell reads at completion time)

```bash
# Bash/Zsh:
local projects=""
if [[ -f "${HOME}/.config/termplex/projects" ]]; then
  projects=$(cut -d= -f1 "${HOME}/.config/termplex/projects")
fi

# Fish:
cut -d= -f1 ~/.config/termplex/projects 2>/dev/null
```

### NEW: `src/completion.test.ts`

Co-located tests for the completion module.

```pseudo
describe("bashCompletion", () => {
  it("returns a non-empty string")
  it("contains the _termplex_completions function name")
  it("registers completion for both 'termplex' and 'ws'")
  it("includes all subcommands in word list")
  it("includes all long flags")
  it("includes all config keys")
  it("includes all layout presets")
  it("reads projects file dynamically with cut -d= -f1")
})

describe("zshCompletion", () => {
  it("returns a non-empty string")
  it("contains compdef for both 'termplex' and 'ws'")
  it("includes all subcommands")
  it("includes all long flags")
  it("includes all config keys")
  it("includes all layout presets")
  it("reads projects file dynamically")
})

describe("fishCompletion", () => {
  it("returns a non-empty string")
  it("contains 'complete -c termplex' statements")
  it("contains 'complete -c ws' statements")
  it("includes all subcommands")
  it("includes all layout presets")
  it("includes all config keys")
  it("uses __fish_seen_subcommand_from for context")
})
```

### MODIFIED: `src/index.ts`

Add `completion` case to the switch statement.

```pseudo
// Add to switch (subcommand) at line 116, before default:
case "completion": {
  const [shell] = args;
  if (!shell || !["bash", "zsh", "fish"].includes(shell)) {
    console.error("Usage: termplex completion [bash|zsh|fish]");
    console.error("");
    console.error("Setup:");
    console.error("  Bash:  echo 'eval \"$(termplex completion bash)\"' >> ~/.bashrc");
    console.error("  Zsh:   echo 'eval \"$(termplex completion zsh)\"' >> ~/.zshrc");
    console.error("  Fish:  termplex completion fish > ~/.config/fish/completions/termplex.fish");
    process.exit(shell ? 1 : 0);  // no shell arg = informational, invalid shell = error
  }
  switch (shell) {
    case "bash": console.log(bashCompletion()); break;
    case "zsh":  console.log(zshCompletion()); break;
    case "fish": console.log(fishCompletion()); break;
  }
  break;
}

// Add import at top:
import { bashCompletion, zshCompletion, fishCompletion } from "./completion.js";
```

## Success Criteria (Automated)

```bash
pnpm run typecheck 2>&1    # no errors
pnpm run lint 2>&1         # no errors
pnpm run test 2>&1         # all tests pass including new completion tests
pnpm run build 2>&1        # builds successfully
```

## Success Criteria (Manual — optional)

```bash
# After build, test zsh completion (macOS default shell):
eval "$(./dist/index.js completion zsh)"
ws <TAB>           # should show subcommands + project names
ws cod<TAB>        # should complete to matching project
ws remove <TAB>    # should show project names
ws --layout <TAB>  # should show layout presets
ws set <TAB>       # should show config keys
```
