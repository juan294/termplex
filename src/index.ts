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

Config keys:
  editor        Command for coding panes (default: claude)
  sidebar       Command for sidebar pane (default: lazygit)
  panes         Number of editor panes (default: 3)
  editor-size   Width % for editor grid (default: 75)

Examples:
  termplex .                    Launch workspace in current directory
  termplex myapp                Launch workspace for registered project
  termplex add myapp ~/code/app Register a project
  termplex set editor claude    Set the editor command
  termplex set panes 4          Set number of editor panes
`.trim();

function showHelp(): void {
  console.log(HELP);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

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

    await launch(targetDir);
  }
}
