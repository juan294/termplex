import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process before importing launcher
const mockExecSync = vi.fn();
vi.mock("node:child_process", () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// Mock config
vi.mock("./config.js", () => ({
  getConfig: vi.fn(),
}));

// Mock fs.existsSync for directory checks
vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
}));

// Import after mocks are set up
const { launch } = await import("./launcher.js");
const { getConfig } = await import("./config.js");
const { existsSync } = await import("node:fs");

beforeEach(() => {
  vi.clearAllMocks();
  // Default: tmux is installed
  // Return string for calls with { encoding }, Buffer otherwise
  mockExecSync.mockImplementation((cmd: string, opts?: { encoding?: string }) => {
    if (cmd === "command -v tmux") return Buffer.from("/usr/bin/tmux");
    if (opts?.encoding) return "";
    return Buffer.from("");
  });
  vi.mocked(existsSync).mockReturnValue(true);
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
      if (cmd === "command -v tmux") return Buffer.from("/usr/bin/tmux");
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
      if (cmd === "command -v tmux") return Buffer.from("/usr/bin/tmux");
      // No existing session — has-session throws
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
      if (cmd === "command -v tmux") return Buffer.from("/usr/bin/tmux");
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
      if (cmd === "command -v tmux") return Buffer.from("/usr/bin/tmux");
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
