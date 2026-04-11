import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock references (captured before vi.mock hoisting) ────────────────────────

const mockAddProject = vi.fn();
const mockRemoveProject = vi.fn();
const mockGetProject = vi.fn();
const mockListProjects = vi.fn();
const mockSetConfig = vi.fn();
const mockListConfig = vi.fn();

vi.mock("./config.js", () => ({
  addProject: mockAddProject,
  removeProject: mockRemoveProject,
  getProject: mockGetProject,
  listProjects: mockListProjects,
  setConfig: mockSetConfig,
  listConfig: mockListConfig,
}));

const mockLaunch = vi.fn();
vi.mock("./launcher.js", () => ({
  launch: mockLaunch,
}));

const mockBashCompletion = vi.fn();
const mockZshCompletion = vi.fn();
const mockFishCompletion = vi.fn();
vi.mock("./completion.js", () => ({
  bashCompletion: mockBashCompletion,
  zshCompletion: mockZshCompletion,
  fishCompletion: mockFishCompletion,
}));

// ── Setup & teardown ──────────────────────────────────────────────────────────

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();

  // Default return values
  mockRemoveProject.mockReturnValue(true);
  mockGetProject.mockReturnValue(undefined);
  mockListProjects.mockReturnValue(new Map());
  mockListConfig.mockReturnValue(new Map());
  mockLaunch.mockResolvedValue(undefined);
  mockBashCompletion.mockReturnValue("# bash");
  mockZshCompletion.mockReturnValue("# zsh");
  mockFishCompletion.mockReturnValue("# fish");

  // Suppress console output and mock process.exit to throw so execution stops
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("process.exit");
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function run(...args: string[]): Promise<void> {
  process.argv = ["node", "index.js", ...args];
  await import("./index.js");
}

async function runExpectExit(code: number, ...args: string[]): Promise<void> {
  process.argv = ["node", "index.js", ...args];
  await expect(import("./index.js")).rejects.toThrow("process.exit");
  expect(exitSpy).toHaveBeenCalledWith(code);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("safeParse — error handling", () => {
  it("prints error and exits 1 on unknown flag", async () => {
    await runExpectExit(1, "--unknown-flag");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Error:"));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("--help"));
  });
});

describe("--version flag", () => {
  it("prints version string and exits 0", async () => {
    await runExpectExit(0, "--version");
    expect(console.log).toHaveBeenCalledWith("0.0.0-test");
  });

  it("-v short flag works", async () => {
    await runExpectExit(0, "-v");
    expect(console.log).toHaveBeenCalledWith("0.0.0-test");
  });
});

describe("--help flag", () => {
  it("prints help text and exits 0", async () => {
    await runExpectExit(0, "--help");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("termplex"));
  });

  it("-h short flag works", async () => {
    await runExpectExit(0, "-h");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("termplex"));
  });
});

describe("no subcommand", () => {
  it("shows help and exits 0 when called with no arguments", async () => {
    await runExpectExit(0);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("termplex"));
  });
});

describe("add subcommand", () => {
  it("registers a project with an absolute path", async () => {
    await run("add", "myapp", "/home/user/myapp");
    expect(mockAddProject).toHaveBeenCalledWith("myapp", "/home/user/myapp");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Registered: myapp"),
    );
  });

  it("expands ~ in path to HOME", async () => {
    const home = process.env.HOME ?? "";
    await run("add", "myapp", "~/projects/myapp");
    expect(mockAddProject).toHaveBeenCalledWith(
      "myapp",
      expect.stringContaining(home),
    );
  });

  it("falls back to empty string when HOME is unset", async () => {
    const origHome = process.env.HOME;
    delete process.env.HOME;
    try {
      await run("add", "myapp", "~/projects/myapp");
      expect(mockAddProject).toHaveBeenCalledWith("myapp", expect.any(String));
    } finally {
      if (origHome !== undefined) process.env.HOME = origHome;
    }
  });

  it("exits 1 when both name and path are missing", async () => {
    await runExpectExit(1, "add");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });

  it("exits 1 when path is missing", async () => {
    await runExpectExit(1, "add", "myapp");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });
});

describe("remove subcommand", () => {
  it("removes an existing project", async () => {
    mockRemoveProject.mockReturnValue(true);
    await run("remove", "myapp");
    expect(mockRemoveProject).toHaveBeenCalledWith("myapp");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Removed: myapp"));
  });

  it("exits 1 when project is not found", async () => {
    mockRemoveProject.mockReturnValue(false);
    await runExpectExit(1, "remove", "ghost");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Project not found: ghost"),
    );
  });

  it("exits 1 when name argument is missing", async () => {
    await runExpectExit(1, "remove");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });
});

describe("list subcommand", () => {
  it("shows empty-state message when no projects registered", async () => {
    mockListProjects.mockReturnValue(new Map());
    await run("list");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No projects"));
  });

  it("prints each registered project", async () => {
    mockListProjects.mockReturnValue(
      new Map([
        ["foo", "/foo"],
        ["bar", "/bar"],
      ]),
    );
    await run("list");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Registered projects:"),
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("foo"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("bar"));
  });
});

describe("set subcommand", () => {
  it("sets a known config key with a value", async () => {
    await run("set", "editor", "vim");
    expect(mockSetConfig).toHaveBeenCalledWith("editor", "vim");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Set editor → vim"),
    );
  });

  it("sets a key with no value (passes empty string)", async () => {
    await run("set", "editor");
    expect(mockSetConfig).toHaveBeenCalledWith("editor", "");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("empty"));
  });

  it("warns when key is not in the known list", async () => {
    await run("set", "totally-unknown-key", "value");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Warning:"));
    expect(mockSetConfig).toHaveBeenCalled();
  });

  it("exits 1 when key argument is missing", async () => {
    await runExpectExit(1, "set");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });
});

describe("config subcommand", () => {
  it("prints current machine config", async () => {
    mockListConfig.mockReturnValue(new Map([["editor", "vim"]]));
    await run("config");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Machine config:"),
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("editor"));
  });

  it("shows (plain shell) for empty config values", async () => {
    mockListConfig.mockReturnValue(new Map([["editor", ""]]));
    await run("config");
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("(plain shell)"),
    );
  });
});

describe("completion subcommand", () => {
  it("outputs bash completion script", async () => {
    await run("completion", "bash");
    expect(mockBashCompletion).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("# bash");
  });

  it("outputs zsh completion script", async () => {
    await run("completion", "zsh");
    expect(mockZshCompletion).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("# zsh");
  });

  it("outputs fish completion script", async () => {
    await run("completion", "fish");
    expect(mockFishCompletion).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("# fish");
  });

  it("exits 0 when no shell argument provided", async () => {
    await runExpectExit(0, "completion");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });

  it("exits 1 when an unrecognized shell is provided", async () => {
    await runExpectExit(1, "completion", "powershell");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
  });
});

describe("launch — default case", () => {
  it("resolves '.' to current working directory", async () => {
    const cwd = process.cwd();
    await run(".");
    expect(mockLaunch).toHaveBeenCalledWith(cwd, expect.any(Object));
  });

  it("passes an absolute path directly", async () => {
    await run("/tmp/my-project");
    expect(mockLaunch).toHaveBeenCalledWith("/tmp/my-project", expect.any(Object));
  });

  it("expands ~ path to HOME", async () => {
    const home = process.env.HOME ?? "";
    await run("~/code/myapp");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.stringContaining(home),
      expect.any(Object),
    );
  });

  it("falls back to empty string for ~ when HOME is unset", async () => {
    const origHome = process.env.HOME;
    delete process.env.HOME;
    try {
      await run("~/code/myapp");
      expect(mockLaunch).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    } finally {
      if (origHome !== undefined) process.env.HOME = origHome;
    }
  });

  it("resolves a registered project name to its path", async () => {
    mockGetProject.mockReturnValue("/registered/path");
    await run("myapp");
    expect(mockLaunch).toHaveBeenCalledWith("/registered/path", expect.any(Object));
  });

  it("exits 1 for an unknown project name", async () => {
    mockGetProject.mockReturnValue(undefined);
    await runExpectExit(1, "unknown-project");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Unknown project: unknown-project"),
    );
  });

  it("passes --layout override to launch", async () => {
    await run(".", "--layout", "minimal");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ layout: "minimal" }),
    );
  });

  it("passes --editor override to launch", async () => {
    await run(".", "--editor", "vim");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ editor: "vim" }),
    );
  });

  it("passes --panes override to launch", async () => {
    await run(".", "--panes", "2");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ panes: "2" }),
    );
  });

  it("passes --editor-size override to launch", async () => {
    await run(".", "--editor-size", "80");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ "editor-size": "80" }),
    );
  });

  it("passes --sidebar override to launch", async () => {
    await run(".", "--sidebar", "htop");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sidebar: "htop" }),
    );
  });

  it("passes --server override to launch", async () => {
    await run(".", "--server", "npm start");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ server: "npm start" }),
    );
  });

  it("passes --mouse flag to launch", async () => {
    await run(".", "--mouse");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ mouse: true }),
    );
  });

  it("passes --no-mouse flag to launch", async () => {
    await run(".", "--no-mouse");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ mouse: false }),
    );
  });

  it("passes --force flag to launch", async () => {
    await run(".", "--force");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ force: true }),
    );
  });

  it("passes -f short force flag to launch", async () => {
    await run(".", "-f");
    expect(mockLaunch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ force: true }),
    );
  });
});
