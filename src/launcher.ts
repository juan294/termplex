import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
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
}

function configureTmuxTitle(): void {
  try {
    tmux(`set-option -g set-titles on`);
    tmux(`set-option -g set-titles-string '#{s/^tp-//:session_name}'`);
  } catch {
    // Non-critical — continue if title config fails
  }
}

function tmux(cmd: string): string {
  return execSync(`tmux ${cmd}`, { encoding: "utf-8" }).trim();
}

function splitPane(
  targetId: string,
  dir: "h" | "v",
  size: number,
  cwd: string,
  command?: string,
): string {
  const cmdPart = command ? ` "${command}; exec $SHELL"` : "";
  return tmux(
    `split-window -${dir} -t "${targetId}" -l ${size}% -c "${cwd}" -P -F "#{pane_id}"${cmdPart}`,
  );
}

function isCommandInstalled(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getInstallCommand(): string | null {
  if (process.platform === "darwin") {
    try {
      execSync("command -v brew", { stdio: "ignore" });
      return "brew install tmux";
    } catch {
      return null;
    }
  }

  if (process.platform === "linux") {
    const managers: [string, string][] = [
      ["apt-get", "sudo apt-get install -y tmux"],
      ["dnf", "sudo dnf install -y tmux"],
      ["yum", "sudo yum install -y tmux"],
      ["pacman", "sudo pacman -S --noconfirm tmux"],
    ];
    for (const [bin, cmd] of managers) {
      try {
        execSync(`command -v ${bin}`, { stdio: "ignore" });
        return cmd;
      } catch {
        // try next
      }
    }
  }

  return null;
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
    if (process.platform === "darwin") {
      try {
        execSync("command -v brew", { stdio: "ignore" });
        return "brew install lazygit";
      } catch {
        return null;
      }
    }
    if (process.platform === "linux") {
      try {
        execSync("command -v brew", { stdio: "ignore" });
        return "brew install lazygit";
      } catch {
        return null;
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
      `Please install \`${cmd}\` manually or change your config with: termplex config set editor <command>`,
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

async function ensureTmux(): Promise<void> {
  if (isCommandInstalled("tmux")) return;

  const installCmd = getInstallCommand();
  if (!installCmd) {
    console.error(
      "tmux is required but not installed, and no supported package manager was found.",
    );
    console.error("Please install tmux manually and try again.");
    process.exit(1);
  }

  console.log("tmux is required but not installed on this machine.");
  const answer = await prompt(`Install it now with \`${installCmd}\`? [Y/n] `);

  if (answer && answer !== "y" && answer !== "yes") {
    console.log("tmux is required for termplex to work. Exiting.");
    process.exit(1);
  }

  console.log(`Running: ${installCmd}`);
  try {
    execSync(installCmd, { stdio: "inherit" });
  } catch {
    console.error(
      "Failed to install tmux. Please install it manually and try again.",
    );
    process.exit(1);
  }

  if (!isCommandInstalled("tmux")) {
    console.error("tmux still not found after install. Please check your PATH.");
    process.exit(1);
  }

  console.log("tmux installed successfully!\n");
}

export function resolveConfig(targetDir: string, cliOverrides: CLIOverrides): Partial<LayoutOptions> {
  const project = readKVFile(join(targetDir, ".termplex"));

  // Resolve layout preset: CLI > project > global
  const layoutKey = cliOverrides.layout ?? project.get("layout") ?? getConfig("layout");
  let base: Partial<LayoutOptions> = {};
  if (layoutKey) {
    if (isPresetName(layoutKey)) {
      base = getPreset(layoutKey);
    } else {
      console.warn(`Unknown layout preset: "${layoutKey}", using defaults.`);
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

  const result: Partial<LayoutOptions> = { ...base };
  if (editor !== undefined) result.editor = editor;
  if (sidebar !== undefined) result.sidebarCommand = sidebar;
  if (panes !== undefined) result.editorPanes = parseInt(panes, 10);
  if (editorSize !== undefined) result.editorSize = parseInt(editorSize, 10);
  if (server !== undefined) result.server = server;

  return result;
}

function buildSession(sessionName: string, targetDir: string, plan: LayoutPlan): void {
  // Create detached session and capture the root pane ID
  tmux(`new-session -d -s "${sessionName}" -c "${targetDir}"`);
  const rootId = tmux(`display -t "${sessionName}:0" -p "#{pane_id}"`);

  // Split right for sidebar — pass command directly to avoid timing issues
  splitPane(rootId, "h", plan.sidebarSize, targetDir, plan.sidebarCommand || undefined);

  // Split left area into two columns — right col first pane gets editor
  const rightColId = splitPane(rootId, "h", 50, targetDir, plan.editor || undefined);

  // --- Left column: additional editor panes ---
  let target = rootId;
  for (let i = 1; i < plan.leftColumnCount; i++) {
    const pct = Math.floor(
      ((plan.leftColumnCount - i) / (plan.leftColumnCount - i + 1)) * 100,
    );
    target = splitPane(target, "v", pct, targetDir, plan.editor || undefined);
  }

  // --- Right column: additional editor panes + optional server pane ---
  const serverCount = plan.hasServer ? 1 : 0;
  const totalRight = plan.rightColumnEditorCount + serverCount;
  target = rightColId;
  for (let i = 1; i < totalRight; i++) {
    const isServer = plan.hasServer && i === totalRight - 1;
    const pct = Math.floor(
      ((totalRight - i) / (totalRight - i + 1)) * 100,
    );
    const cmd = isServer
      ? (plan.serverCommand ?? undefined)
      : (plan.editor || undefined);
    target = splitPane(target, "v", pct, targetDir, cmd);
  }

  // Root pane was created with a plain shell — replace it with the editor
  if (plan.editor) {
    tmux(`respawn-pane -k -t "${rootId}" -c "${targetDir}" "${plan.editor}; exec $SHELL"`);
  }

  // Focus the first editor pane
  tmux(`select-pane -t "${rootId}"`);
}

export async function launch(targetDir: string, cliOverrides?: CLIOverrides): Promise<void> {
  if (!existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  await ensureTmux();

  const opts = resolveConfig(targetDir, cliOverrides ?? {});
  const plan = planLayout(opts);

  if (plan.editor) await ensureCommand(plan.editor);
  if (plan.sidebarCommand) await ensureCommand(plan.sidebarCommand);
  if (plan.serverCommand) {
    const serverBin = plan.serverCommand.split(" ")[0]!;
    await ensureCommand(serverBin);
  }

  const dirName = basename(targetDir).replace(/[^a-zA-Z0-9_-]/g, "_");
  const sessionName = `tp-${dirName}`;

  // If session already exists, just re-attach
  try {
    execSync(`tmux has-session -t "${sessionName}"`, { stdio: "ignore" });
    console.log(`Attaching to existing session: ${sessionName}`);
    configureTmuxTitle();
    execSync(`tmux attach-session -t "${sessionName}"`, { stdio: "inherit" });
    return;
  } catch {
    // Session doesn't exist — create it below
  }

  buildSession(sessionName, targetDir, plan);

  try {
    configureTmuxTitle();
    execSync(`tmux attach-session -t "${sessionName}"`, { stdio: "inherit" });
  } catch {
    // tmux exited (user detached / closed) — that's fine
  }
}
