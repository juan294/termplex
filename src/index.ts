import { Command } from "commander";
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

const program = new Command();

program
  .name("termplex")
  .description("Launch configurable multi-pane terminal workspaces")
  .version("0.1.0");

// --- Launch (default command) ---
program
  .argument("[target]", "Project name, path, or '.' for current directory")
  .action(async (target?: string) => {
    if (!target) {
      program.help();
      return;
    }

    let targetDir: string;

    if (target === ".") {
      targetDir = process.cwd();
    } else if (target.startsWith("/") || target.startsWith("~")) {
      targetDir = resolve(target.replace(/^~/, process.env.HOME ?? ""));
    } else {
      // Look up project name
      const path = getProject(target);
      if (!path) {
        console.error(`Unknown project: ${target}`);
        console.error(`Register it with: termplex add ${target} /path/to/project`);
        console.error(`Or see available:  termplex list`);
        process.exit(1);
      }
      targetDir = path;
    }

    await launch(targetDir);
  });

// --- Project management ---
program
  .command("add <name> <path>")
  .description("Register a project name → path mapping")
  .action((name: string, path: string) => {
    const resolved = resolve(path.replace(/^~/, process.env.HOME ?? ""));
    addProject(name, resolved);
    console.log(`Registered: ${name} → ${resolved}`);
  });

program
  .command("remove <name>")
  .description("Remove a registered project")
  .action((name: string) => {
    removeProject(name);
    console.log(`Removed: ${name}`);
  });

program
  .command("list")
  .description("List all registered projects")
  .action(() => {
    const projects = listProjects();
    if (projects.size === 0) {
      console.log("No projects registered. Use: termplex add <name> <path>");
      return;
    }
    console.log("Registered projects:");
    for (const [name, path] of projects) {
      console.log(`  ${name} → ${path}`);
    }
  });

// --- Machine config ---
program
  .command("set <key> [value]")
  .description("Set a machine-level config value")
  .addHelpText(
    "after",
    `
Config keys:
  editor        Command for coding panes (default: claude)
  sidebar       Command for sidebar pane (default: lazygit)
  panes         Number of editor panes (default: 3)
  editor-size   Width % for editor grid (default: 75)

Examples:
  termplex set editor claude
  termplex set editor ""          # Plain shells
  termplex set sidebar lazygit
  termplex set panes 4
  termplex set editor-size 80`
  )
  .action((key: string, value?: string) => {
    setConfig(key, value ?? "");
    if (value) {
      console.log(`Set ${key} → ${value}`);
    } else {
      console.log(`Set ${key} → (empty, will open plain shell)`);
    }
  });

program
  .command("config")
  .description("Show current machine configuration")
  .action(() => {
    const config = listConfig();
    console.log("Machine config:");
    for (const [key, value] of config) {
      console.log(`  ${key} → ${value || "(plain shell)"}`);
    }
  });

program.parse();
