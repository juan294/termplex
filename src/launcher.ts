import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { execFileSync, execSync } from "node:child_process";
import { planLayout, isPresetName, getPreset } from "./layout.js";
import type { LayoutOptions, LayoutPlan } from "./layout.js";
import { getConfig, readKVFile } from "./config.js";

export interface CLIOverrides {
  layout?: string;
  editor?: string;
  panes?: string;
  "editor-size"?: string;
  sidebar?: string;
  server?: string;
  mouse?: boolean;
  force?: boolean;
}

function configureTmuxTitle(): void {
  try {
    tmux(["set-option", "-g", "set-titles", "on"]);
    tmux(["set-option", "-g", "set-titles-string", "#{s/^tp-//:session_name}"]);
  } catch {
    // Non-critical — continue if title config fails
  }
}

function commandName(command: string): string {
  const trimmed = command.trim();
  const match = /^(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(trimmed);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

function tmux(args: string[], options?: { stdio: "ignore" | "inherit" }): string {
  const output = execFileSync("tmux", args, options ?? { encoding: "utf-8" });
  return typeof output === "string" ? output.trim() : "";
}

function splitPane(
  targetId: string,
  dir: "h" | "v",
  size: number,
  cwd: string,
  command?: string,
): string {
  const args = [
    "split-window",
    `-${dir}`,
    "-t",
    targetId,
    "-l",
    `${size}%`,
    "-c",
    cwd,
    "-P",
    "-F",
    "#{pane_id}",
  ];
  if (command) args.push(`${command}; exec $SHELL`);
  return tmux(args);
}

function isCommandInstalled(cmd: string): boolean {
  const binary = commandName(cmd);
  if (!binary) return true;
  try {
    execFileSync("which", [binary], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

const KNOWN_INSTALL_COMMANDS: Record<string, () => string | null> = {
  claude: () => "npm install -g @anthropic-ai/claude-code",
  lazygit: () => {
    if ((process.platform === "darwin" || process.platform === "linux") && isCommandInstalled("brew")) {
      return "brew install lazygit";
    }
    return null;
  },
  tmux: () => {
    if (process.platform === "darwin") {
      return isCommandInstalled("brew") ? "brew install tmux" : null;
    }
    if (process.platform === "linux") {
      const managers: [string, string][] = [
        ["apt-get", "sudo apt-get install -y tmux"],
        ["dnf", "sudo dnf install -y tmux"],
        ["yum", "sudo yum install -y tmux"],
        ["pacman", "sudo pacman -S --noconfirm tmux"],
      ];
      for (const [bin, cmd] of managers) {
        if (isCommandInstalled(bin)) return cmd;
      }
    }
    return null;
  },
};

async function ensureCommand(cmd: string): Promise<void> {
  if (isCommandInstalled(cmd)) return;

  const getInstall = KNOWN_INSTALL_COMMANDS[cmd];
  const installCmd = getInstall ? getInstall() : null;

  if (!installCmd) {
    console.error(
      `\`${cmd}\` is required but not installed, and no known install method was found.`,
    );
    console.error(
      `Please install \`${cmd}\` manually or change your config with: termplex set editor <command>`,
    );
    process.exit(1);
  }

  console.log(`\`${cmd}\` is required but not installed on this machine.`);
  const answer = await prompt(`Install it now with \`${installCmd}\`? [Y/n] `);

  if (answer && answer !== "y" && answer !== "yes") {
    console.log(`\`${cmd}\` is required for this workspace layout. Exiting.`);
    process.exit(1);
  }

  console.log(`Running: ${installCmd}`);
  try {
    // installCmd comes from KNOWN_INSTALL_COMMANDS — same trust model as Makefile or .envrc.
    execSync(installCmd, { stdio: "inherit" });
  } catch {
    console.error(
      `Failed to install \`${cmd}\`. Please install it manually and try again.`,
    );
    process.exit(1);
  }

  if (!isCommandInstalled(cmd)) {
    console.error(`\`${cmd}\` still not found after install. Please check your PATH.`);
    process.exit(1);
  }

  console.log(`\`${cmd}\` installed successfully!\n`);
}

export interface ResolvedConfig {
  opts: Partial<LayoutOptions>;
  mouse: boolean;
}

export function resolveConfig(targetDir: string, cliOverrides: CLIOverrides): ResolvedConfig {
  const project = readKVFile(join(targetDir, ".termplex"));

  // Resolve layout preset: CLI > project > global
  const layoutKey = cliOverrides.layout ?? project.get("layout") ?? getConfig("layout");
  let base: Partial<LayoutOptions> = {};
  if (layoutKey) {
    if (isPresetName(layoutKey)) {
      base = getPreset(layoutKey);
    } else {
      console.warn(`Unknown layout preset: "${layoutKey}". Valid presets: minimal, full, pair, cli, mtop. Using defaults.`);
    }
  }

  // Layer: CLI > project > global > preset (for each config key)
  const pick = (cli: string | undefined, projKey: string): string | undefined =>
    cli ?? project.get(projKey) ?? getConfig(projKey);

  const editor = pick(cliOverrides.editor, "editor");
  const sidebar = pick(cliOverrides.sidebar, "sidebar");
  const panes = pick(cliOverrides.panes, "panes");
  const editorSize = pick(cliOverrides["editor-size"], "editor-size");
  const server = pick(cliOverrides.server, "server");

  // Mouse: CLI > project > global > default (true)
  const mouse = cliOverrides.mouse ?? (project.has("mouse") ? project.get("mouse") !== "false" : (getConfig("mouse") !== "false"));

  const result: Partial<LayoutOptions> = { ...base };
  if (editor !== undefined) result.editor = editor;
  if (sidebar !== undefined) result.sidebarCommand = sidebar;
  if (panes !== undefined) {
    const parsed = parseInt(panes, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      console.warn(`Invalid panes value: "${panes}". Must be a positive integer. Using default (3).`);
      result.editorPanes = 3;
    } else {
      result.editorPanes = parsed;
    }
  }
  if (editorSize !== undefined) {
    const parsed = parseInt(editorSize, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 99) {
      console.warn(`Invalid editor-size value: "${editorSize}". Must be 1-99. Using default (75).`);
      result.editorSize = 75;
    } else {
      result.editorSize = parsed;
    }
  }
  if (server !== undefined) result.server = server;

  return { opts: result, mouse };
}

function configureMouseMode(sessionName: string, mouse: boolean): void {
  try {
    tmux(["set-option", "-t", sessionName, "mouse", mouse ? "on" : "off"]);
  } catch {
    // Non-critical — continue if mouse config fails
  }
}

function buildSession(sessionName: string, targetDir: string, plan: LayoutPlan, mouse: boolean): void {
  // Create detached session and capture the root pane ID
  tmux(["new-session", "-d", "-s", sessionName, "-c", targetDir]);
  const rootId = tmux(["display", "-t", `${sessionName}:0`, "-p", "#{pane_id}"]);

  // Enable/disable mouse mode for this session
  configureMouseMode(sessionName, mouse);

  // Split right for sidebar — pass command directly to avoid timing issues
  splitPane(rootId, "h", plan.sidebarSize, targetDir, plan.sidebarCommand || undefined);

  // --- Right column (only if there are editor panes or a server pane) ---
  const serverCount = plan.hasServer ? 1 : 0;
  const totalRight = plan.rightColumnEditorCount + serverCount;
  let rightColId: string | null = null;
  if (totalRight > 0) {
    const firstCmd = plan.rightColumnEditorCount > 0
      ? (plan.secondaryEditor ?? (plan.editor || undefined))
      : (plan.serverCommand ?? undefined);
    rightColId = splitPane(rootId, "h", 50, targetDir, firstCmd);
  }

  // --- Left column: additional editor panes ---
  let target = rootId;
  for (let i = 1; i < plan.leftColumnCount; i++) {
    const pct = Math.floor(
      ((plan.leftColumnCount - i) / (plan.leftColumnCount - i + 1)) * 100,
    );
    target = splitPane(target, "v", pct, targetDir, plan.editor || undefined);
  }

  // --- Right column: additional editor panes + optional server pane ---
  if (rightColId) {
    target = rightColId;
    for (let i = 1; i < totalRight; i++) {
      const isServer = plan.hasServer && i === totalRight - 1;
      const pct = Math.floor(
        ((totalRight - i) / (totalRight - i + 1)) * 100,
      );
      const cmd = isServer
        ? (plan.serverCommand ?? undefined)
        : (plan.secondaryEditor ?? (plan.editor || undefined));
      target = splitPane(target, "v", pct, targetDir, cmd);
    }
  }

  // Root pane was created with a plain shell — replace it with the editor
  if (plan.editor) {
    tmux(["respawn-pane", "-k", "-t", rootId, "-c", targetDir, `${plan.editor}; exec $SHELL`]);
  }

  // Focus the first editor pane
  tmux(["select-pane", "-t", rootId]);
}

export async function launch(targetDir: string, cliOverrides?: CLIOverrides): Promise<void> {
  if (!existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  await ensureCommand("tmux");

  const { opts, mouse } = resolveConfig(targetDir, cliOverrides ?? {});
  const plan = planLayout(opts);

  if (plan.editor) await ensureCommand(plan.editor);
  if (plan.sidebarCommand) await ensureCommand(plan.sidebarCommand);
  if (plan.secondaryEditor) {
    await ensureCommand(plan.secondaryEditor);
  }
  if (plan.serverCommand) {
    await ensureCommand(plan.serverCommand);
  }

  const dirName = basename(targetDir).replace(/[^a-zA-Z0-9_-]/g, "_");
  const sessionName = `tp-${dirName}`;

  // If session already exists, kill it with --force or re-attach
  try {
    tmux(["has-session", "-t", sessionName], { stdio: "ignore" });
    if (cliOverrides?.force) {
      tmux(["kill-session", "-t", sessionName], { stdio: "ignore" });
    } else {
      console.log(`Attaching to existing session: ${sessionName}`);
      configureMouseMode(sessionName, mouse);
      configureTmuxTitle();
      tmux(["attach-session", "-t", sessionName], { stdio: "inherit" });
      return;
    }
  } catch {
    // Session doesn't exist — create it below
  }

  buildSession(sessionName, targetDir, plan, mouse);

  try {
    configureTmuxTitle();
    tmux(["attach-session", "-t", sessionName], { stdio: "inherit" });
  } catch {
    // tmux exited (user detached / closed) — that's fine
  }
}
