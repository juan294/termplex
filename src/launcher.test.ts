import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process before importing launcher
const mockExecSync = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// Mock config
const mockReadKVFile = vi.fn((_path: string) => new Map<string, string>());
vi.mock("./config.js", () => ({
  getConfig: vi.fn(),
  readKVFile: (path: string) => mockReadKVFile(path),
}));

// Mock fs.existsSync for directory checks
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
}));

// Mock readline for prompt tests
const mockQuestion = vi.fn();
vi.mock("node:readline", () => ({
  createInterface: () => ({
    question: (_q: string, cb: (a: string) => void) => mockQuestion(_q, cb),
    close: vi.fn(),
  }),
}));

// Import after mocks are set up
const { launch, resolveConfig } = await import("./launcher.js");
const { getConfig } = await import("./config.js");
const { existsSync } = await import("node:fs");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all commands are installed
  mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
    if (typeof cmd === "string" && cmd.startsWith("command -v "))
      return Buffer.from("/usr/bin/stub");
    if (opts?.encoding) return "";
    return Buffer.from("");
  });
  vi.mocked(existsSync).mockReturnValue(true);
  mockReadKVFile.mockReturnValue(new Map<string, string>());
});

describe("tmux detection", () => {
  it("exits with error if directory does not exist", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await expect(launch("/nonexistent")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it("checks for tmux installation", async () => {
    // Simulate existing session — attach succeeds immediately
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });

    await launch("/tmp/test-project");
    expect(mockExecSync).toHaveBeenCalledWith("command -v tmux", {
      stdio: "ignore",
    });
  });
});

describe("session name generation", () => {
  it("derives session name from directory basename", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/home/user/my-project");

    // Should have created session with name tp-my-project
    const newSessionCall = mockExecSync.mock.calls.find(
      (call) =>
        typeof call[0] === "string" && call[0].includes("new-session"),
    );
    expect(newSessionCall).toBeDefined();
    expect(newSessionCall![0]).toContain("tp-my-project");
  });
});

describe("buildSession", () => {
  it("creates a tmux session with configured panes", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "vim";
      if (key === "panes") return "2";
      if (key === "editor-size") return "70";
      if (key === "sidebar") return "htop";
      return undefined;
    });

    await launch("/tmp/workspace");

    // Should call new-session, split-window, etc.
    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));
    expect(tmuxCalls.length).toBeGreaterThan(0);
    expect(tmuxCalls.some((c) => c.includes("new-session"))).toBe(true);
    expect(tmuxCalls.some((c) => c.includes("split-window"))).toBe(true);
  });

  it("reattaches to existing session instead of creating new one", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      // has-session succeeds — session exists
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });

    await launch("/tmp/workspace");

    const tmuxCalls = mockExecSync.mock.calls.map((c) => c[0] as string);
    expect(tmuxCalls.some((c) => c.includes("attach-session"))).toBe(true);
    expect(tmuxCalls.some((c) => c.includes("new-session"))).toBe(false);
  });
});

describe("server pane toggle", () => {
  it("skips server pane when server=false", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "vim";
      if (key === "panes") return "1";
      if (key === "sidebar") return "lazygit";
      if (key === "server") return "false";
      return undefined;
    });

    await launch("/tmp/workspace");

    // With 1 editor pane and no server: left=1, right=0
    // Should have: new-session, split for sidebar only (no right col needed)
    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    // Count split-window calls — should be exactly 1 (sidebar only)
    const splits = tmuxCalls.filter((c) => c.includes("split-window"));
    expect(splits.length).toBe(1);
  });

  it("creates server-only right column when no right-col editors", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/tmp/workspace", { layout: "cli" });

    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    // cli = 1 pane + server → sidebar split + right col split (2 total)
    const splits = tmuxCalls.filter((c) => c.includes("split-window"));
    expect(splits.length).toBe(2);

    // Right col pane should have server command, not editor
    const serverSplit = splits.find((c) => c.includes("npm login"));
    expect(serverSplit).toBeDefined();
    const editorSplits = splits.filter((c) => c.includes("claude"));
    // No split should launch claude — the only editor is the root pane (respawned)
    expect(editorSplits.length).toBe(0);
  });

  it("passes custom server command to pane", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "vim";
      if (key === "panes") return "2";
      if (key === "sidebar") return "lazygit";
      if (key === "server") return "npm run dev";
      return undefined;
    });

    await launch("/tmp/workspace");

    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    // The server pane should contain the custom command
    const serverSplit = tmuxCalls.find(
      (c) => c.includes("split-window") && c.includes("npm run dev"),
    );
    expect(serverSplit).toBeDefined();
  });
});

describe("command dependency checks", () => {
  it("checks editor and sidebar commands before building session", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/tmp/workspace");

    // Default editor=claude, sidebar=lazygit
    expect(mockExecSync).toHaveBeenCalledWith("command -v claude", {
      stdio: "ignore",
    });
    expect(mockExecSync).toHaveBeenCalledWith("command -v lazygit", {
      stdio: "ignore",
    });
  });

  it("already-installed commands proceed without prompting", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/tmp/workspace");

    // prompt (readline.question) should never have been called
    expect(mockQuestion).not.toHaveBeenCalled();
  });

  it("offers to install a known missing command (claude)", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (cmd === "command -v claude") throw new Error("not found");
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    // User accepts the install prompt
    mockQuestion.mockImplementation((_q: string, cb: (a: string) => void) => {
      cb("y");
    });

    // After install, command -v should succeed on second call
    let claudeCallCount = 0;
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (cmd === "command -v claude") {
        claudeCallCount++;
        if (claudeCallCount <= 1) throw new Error("not found");
        return Buffer.from("/usr/bin/claude");
      }
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });

    await launch("/tmp/workspace");

    // Should have prompted and run install
    expect(mockQuestion).toHaveBeenCalledTimes(1);
    expect(mockQuestion.mock.calls[0]![0]).toContain(
      "npm install -g @anthropic-ai/claude-code",
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      "npm install -g @anthropic-ai/claude-code",
      { stdio: "inherit" },
    );
  });

  it("exits when unknown command is missing", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (cmd === "command -v obscure-tool") throw new Error("not found");
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "obscure-tool";
      if (key === "sidebar") return "htop";
      return undefined;
    });

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await expect(launch("/tmp/workspace")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it("skips check when editor config is empty string", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        return opts?.encoding ? "" : Buffer.from("");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "";
      if (key === "sidebar") return "";
      return undefined;
    });

    await launch("/tmp/workspace");

    // Should NOT check for empty-string commands
    const commandChecks = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("command -v "));
    // Only tmux should be checked
    expect(commandChecks).toEqual(["command -v tmux"]);
  });

  it("exits when user declines install", async () => {
    let claudeCallCount = 0;
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (cmd === "command -v claude") {
        claudeCallCount++;
        throw new Error("not found");
      }
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      return opts?.encoding ? "" : Buffer.from("");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    // User declines
    mockQuestion.mockImplementation((_q: string, cb: (a: string) => void) => {
      cb("n");
    });

    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await expect(launch("/tmp/workspace")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});

describe("config resolution", () => {
  it("project config overrides global config", () => {
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "editor") return "claude";
      return undefined;
    });
    mockReadKVFile.mockReturnValue(new Map([["editor", "vim"]]));

    const { opts } = resolveConfig("/tmp/workspace", {});
    expect(opts.editor).toBe("vim");
  });

  it("CLI overrides project config", () => {
    mockReadKVFile.mockReturnValue(new Map([["editor", "vim"]]));

    const { opts } = resolveConfig("/tmp/workspace", { editor: "nano" });
    expect(opts.editor).toBe("nano");
  });

  it("preset expansion with individual key overrides", () => {
    // Project file sets layout=minimal (1 pane, no server) but overrides panes=4
    mockReadKVFile.mockReturnValue(new Map([["layout", "minimal"], ["panes", "4"]]));
    vi.mocked(getConfig).mockReturnValue(undefined);

    const { opts } = resolveConfig("/tmp/workspace", {});
    // Preset minimal sets editorPanes=1, but project overrides to 4
    expect(opts.editorPanes).toBe(4);
    // Preset minimal sets server=false, no override → stays false
    expect(opts.server).toBe("false");
  });

  it("unknown preset warns and falls through to defaults", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockReadKVFile.mockReturnValue(new Map([["layout", "bogus"]]));
    vi.mocked(getConfig).mockReturnValue(undefined);

    const { opts } = resolveConfig("/tmp/workspace", {});
    expect(warnSpy).toHaveBeenCalledWith(
      'Unknown layout preset: "bogus", using defaults.',
    );
    // No preset expansion — opts should have no editorPanes set from preset
    expect(opts.editorPanes).toBeUndefined();
    warnSpy.mockRestore();
  });

  it("CLI flags are passed through to launch", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/tmp/workspace", { layout: "minimal" });

    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    // minimal = 1 pane, no server → only sidebar split (1 total)
    const splits = tmuxCalls.filter((c) => c.includes("split-window"));
    expect(splits.length).toBe(1);
  });
});

describe("mouse mode", () => {
  it("defaults to mouse on", () => {
    vi.mocked(getConfig).mockReturnValue(undefined);
    mockReadKVFile.mockReturnValue(new Map());

    const { mouse } = resolveConfig("/tmp/workspace", {});
    expect(mouse).toBe(true);
  });

  it("respects --no-mouse CLI flag", () => {
    vi.mocked(getConfig).mockReturnValue(undefined);
    mockReadKVFile.mockReturnValue(new Map());

    const { mouse } = resolveConfig("/tmp/workspace", { mouse: false });
    expect(mouse).toBe(false);
  });

  it("respects mouse=false in project config", () => {
    vi.mocked(getConfig).mockReturnValue(undefined);
    mockReadKVFile.mockReturnValue(new Map([["mouse", "false"]]));

    const { mouse } = resolveConfig("/tmp/workspace", {});
    expect(mouse).toBe(false);
  });

  it("respects mouse=false in machine config", () => {
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "mouse") return "false";
      return undefined;
    });
    mockReadKVFile.mockReturnValue(new Map());

    const { mouse } = resolveConfig("/tmp/workspace", {});
    expect(mouse).toBe(false);
  });

  it("CLI --mouse overrides project mouse=false", () => {
    vi.mocked(getConfig).mockReturnValue(undefined);
    mockReadKVFile.mockReturnValue(new Map([["mouse", "false"]]));

    const { mouse } = resolveConfig("/tmp/workspace", { mouse: true });
    expect(mouse).toBe(true);
  });

  it("sets tmux mouse option when building a new session", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockReturnValue(undefined);

    await launch("/tmp/workspace");

    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    expect(tmuxCalls.some((c) => c.includes("set-option") && c.includes("mouse on"))).toBe(true);
  });

  it("sets mouse off when disabled via config", async () => {
    mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
      if (typeof cmd === "string" && cmd.startsWith("command -v "))
        return Buffer.from("/usr/bin/stub");
      if (typeof cmd === "string" && cmd.includes("has-session"))
        throw new Error("no session");
      return opts?.encoding ? "%0" : Buffer.from("%0");
    });
    vi.mocked(getConfig).mockImplementation((key: string) => {
      if (key === "mouse") return "false";
      return undefined;
    });

    await launch("/tmp/workspace");

    const tmuxCalls = mockExecSync.mock.calls
      .map((c) => c[0] as string)
      .filter((c) => c.startsWith("tmux "));

    expect(tmuxCalls.some((c) => c.includes("set-option") && c.includes("mouse off"))).toBe(true);
  });
});
