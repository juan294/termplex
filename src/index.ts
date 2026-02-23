import { parseArgs } from "node:util";
import { resolve } from "node:path";
import {
  addProject,
  removeProject,
  getProject,
  listProjects,
  setConfig,
  listConfig,
} from "./config.js";
import { launch } from "./launcher.js";
import type { CLIOverrides } from "./launcher.js";

const HELP = `
termplex — Launch configurable multi-pane terminal workspaces

Usage:
  termplex <target>             Launch workspace (project name, path, or '.')
  termplex add <name> <path>    Register a project name → path mapping
  termplex remove <name>        Remove a registered project
  termplex list                 List all registered projects
  termplex set <key> [value]    Set a machine-level config value
  termplex config               Show current machine configuration

Options:
  -h, --help                    Show this help message
  -v, --version                 Show version number
  -f, --force                   Kill existing session and recreate it
  -l, --layout <preset>         Use a layout preset (minimal, full, pair, cli)
  --editor <cmd>                Override editor command
  --panes <n>                   Override number of editor panes
  --editor-size <n>             Override editor width %
  --sidebar <cmd>               Override sidebar command
  --server <value>              Server pane: true, false, or a command
  --mouse / --no-mouse          Enable/disable mouse mode (default: on)

Config keys:
  editor        Command for coding panes (default: claude)
  sidebar       Command for sidebar pane (default: lazygit)
  panes         Number of editor panes (default: 3)
  editor-size   Width % for editor grid (default: 75)
  server        Server pane toggle (default: true)
  mouse         Enable tmux mouse mode (default: true)
  layout        Default layout preset

Layout presets:
  minimal       1 editor pane, no server
  full          3 editor panes + server (default)
  pair          2 editor panes + server
  cli           1 editor pane + server (npm login)

Per-project config:
  Place a .termplex file in your project root with key=value pairs.
  Project config overrides machine config; CLI flags override both.

Examples:
  termplex .                    Launch workspace in current directory
  termplex myapp                Launch workspace for registered project
  termplex add myapp ~/code/app Register a project
  termplex set editor claude    Set the editor command
  termplex . --layout minimal   Launch with minimal preset
  termplex . --server "npm run dev"  Launch with custom server command
`.trim();

function showHelp(): void {
  console.log(HELP);
}

const parseOpts = {
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
    force: { type: "boolean", short: "f" },
    layout: { type: "string", short: "l" },
    editor: { type: "string" },
    panes: { type: "string" },
    "editor-size": { type: "string" },
    sidebar: { type: "string" },
    server: { type: "string" },
    mouse: { type: "boolean" },
  },
} as const;

function safeParse() {
  try {
    return parseArgs(parseOpts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    console.error(`Run 'termplex --help' for usage information.`);
    process.exit(1);
  }
}

const { values, positionals } = safeParse();

if (values.version) {
  console.log(__VERSION__);
  process.exit(0);
}

if (values.help) {
  showHelp();
  process.exit(0);
}

const [subcommand, ...args] = positionals;

if (!subcommand) {
  showHelp();
  process.exit(0);
}

switch (subcommand) {
  case "add": {
    const [name, path] = args;
    if (!name || !path) {
      console.error("Usage: termplex add <name> <path>");
      process.exit(1);
    }
    const resolved = resolve(path.replace(/^~/, process.env.HOME ?? ""));
    addProject(name, resolved);
    console.log(`Registered: ${name} → ${resolved}`);
    break;
  }

  case "remove": {
    const [name] = args;
    if (!name) {
      console.error("Usage: termplex remove <name>");
      process.exit(1);
    }
    removeProject(name);
    console.log(`Removed: ${name}`);
    break;
  }

  case "list": {
    const projects = listProjects();
    if (projects.size === 0) {
      console.log("No projects registered. Use: termplex add <name> <path>");
    } else {
      console.log("Registered projects:");
      for (const [name, path] of projects) {
        console.log(`  ${name} → ${path}`);
      }
    }
    break;
  }

  case "set": {
    const [key, value] = args;
    if (!key) {
      console.error("Usage: termplex set <key> [value]");
      process.exit(1);
    }
    setConfig(key, value ?? "");
    if (value) {
      console.log(`Set ${key} → ${value}`);
    } else {
      console.log(`Set ${key} → (empty, will open plain shell)`);
    }
    break;
  }

  case "config": {
    const config = listConfig();
    console.log("Machine config:");
    for (const [key, value] of config) {
      console.log(`  ${key} → ${value || "(plain shell)"}`);
    }
    break;
  }

  default: {
    // Treat as launch target (project name, path, or '.')
    const target = subcommand;
    let targetDir: string;

    if (target === ".") {
      targetDir = process.cwd();
    } else if (target.startsWith("/") || target.startsWith("~")) {
      targetDir = resolve(target.replace(/^~/, process.env.HOME ?? ""));
    } else {
      const path = getProject(target);
      if (!path) {
        console.error(`Unknown project: ${target}`);
        console.error(
          `Register it with: termplex add ${target} /path/to/project`,
        );
        console.error(`Or see available:  termplex list`);
        process.exit(1);
      }
      targetDir = path;
    }

    const overrides: CLIOverrides = {};
    if (values.layout) overrides.layout = values.layout;
    if (values.editor) overrides.editor = values.editor;
    if (values.panes) overrides.panes = values.panes;
    if (values["editor-size"]) overrides["editor-size"] = values["editor-size"];
    if (values.sidebar) overrides.sidebar = values.sidebar;
    if (values.server) overrides.server = values.server;
    if (values.mouse !== undefined) overrides.mouse = values.mouse;
    if (values.force) overrides.force = true;

    await launch(targetDir, overrides);
  }
}
