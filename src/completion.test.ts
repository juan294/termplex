import { describe, it, expect } from "vitest";
import { bashCompletion, zshCompletion, fishCompletion } from "./completion.js";

const SUBCOMMANDS = ["add", "remove", "list", "set", "config", "completion"];
const LONG_FLAGS = [
  "--help", "--version", "--force", "--layout", "--editor",
  "--panes", "--editor-size", "--sidebar", "--server", "--mouse", "--no-mouse",
];
const CONFIG_KEYS = ["editor", "sidebar", "panes", "editor-size", "server", "mouse", "layout"];
const PRESETS = ["minimal", "full", "pair", "cli", "mtop"];

describe("bashCompletion", () => {
  const script = bashCompletion();

  it("returns a non-empty string", () => {
    expect(script.length).toBeGreaterThan(0);
  });

  it("contains the _termplex_completions function name", () => {
    expect(script).toContain("_termplex_completions()");
  });

  it("registers completion for both 'termplex' and 'ws'", () => {
    expect(script).toContain("complete -F _termplex_completions termplex");
    expect(script).toContain("complete -F _termplex_completions ws");
  });

  it("includes all subcommands in word list", () => {
    for (const sub of SUBCOMMANDS) {
      expect(script).toContain(sub);
    }
  });

  it("includes all long flags", () => {
    for (const flag of LONG_FLAGS) {
      expect(script).toContain(flag);
    }
  });

  it("includes all config keys", () => {
    for (const key of CONFIG_KEYS) {
      expect(script).toContain(key);
    }
  });

  it("includes all layout presets", () => {
    for (const preset of PRESETS) {
      expect(script).toContain(preset);
    }
  });

  it("reads projects file dynamically with cut -d= -f1", () => {
    expect(script).toContain('cut -d= -f1');
    expect(script).toContain(".config/termplex/projects");
  });
});

describe("zshCompletion", () => {
  const script = zshCompletion();

  it("returns a non-empty string", () => {
    expect(script.length).toBeGreaterThan(0);
  });

  it("contains compdef for both 'termplex' and 'ws'", () => {
    expect(script).toContain("compdef _termplex termplex");
    expect(script).toContain("compdef _termplex ws");
  });

  it("includes all subcommands", () => {
    for (const sub of SUBCOMMANDS) {
      expect(script).toContain(sub);
    }
  });

  it("includes all long flags", () => {
    for (const flag of LONG_FLAGS) {
      expect(script).toContain(flag);
    }
  });

  it("includes all config keys", () => {
    for (const key of CONFIG_KEYS) {
      expect(script).toContain(key);
    }
  });

  it("includes all layout presets", () => {
    for (const preset of PRESETS) {
      expect(script).toContain(preset);
    }
  });

  it("reads projects file dynamically", () => {
    expect(script).toContain('cut -d= -f1');
    expect(script).toContain(".config/termplex/projects");
  });
});

describe("fishCompletion", () => {
  const script = fishCompletion();

  it("returns a non-empty string", () => {
    expect(script.length).toBeGreaterThan(0);
  });

  it("contains 'complete -c termplex' statements", () => {
    expect(script).toContain("complete -c termplex");
  });

  it("contains 'complete -c ws' statements", () => {
    expect(script).toContain("complete -c ws");
  });

  it("includes all subcommands", () => {
    for (const sub of SUBCOMMANDS) {
      expect(script).toContain(sub);
    }
  });

  it("includes all layout presets", () => {
    for (const preset of PRESETS) {
      expect(script).toContain(preset);
    }
  });

  it("includes all config keys", () => {
    for (const key of CONFIG_KEYS) {
      expect(script).toContain(key);
    }
  });

  it("uses __fish_seen_subcommand_from for context", () => {
    expect(script).toContain("__fish_seen_subcommand_from");
  });

  it("reads projects file dynamically", () => {
    expect(script).toContain('cut -d= -f1');
    expect(script).toContain(".config/termplex/projects");
  });
});
