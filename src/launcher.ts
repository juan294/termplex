import { existsSync } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";
import { planLayout } from "./layout.js";
import { getConfig } from "./config.js";

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

function buildSession(sessionName: string, targetDir: string): void {
  const editor = getConfig("editor") ?? "claude";
  const sidebarCommand = getConfig("sidebar") ?? "lazygit";
  const editorPanes = parseInt(getConfig("panes") ?? "3", 10);
  const editorSize = parseInt(getConfig("editor-size") ?? "75", 10);
  const server = getConfig("server") ?? "true";

  const plan = planLayout({ editor, sidebarCommand, editorPanes, editorSize, server });

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

export async function launch(targetDir: string): Promise<void> {
  if (!existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    process.exit(1);
  }

  await ensureTmux();

  const editor = getConfig("editor") ?? "claude";
  const sidebar = getConfig("sidebar") ?? "lazygit";
  const server = getConfig("server") ?? "true";
  if (editor) await ensureCommand(editor);
  if (sidebar) await ensureCommand(sidebar);

  // If server is a custom command (not "true"/"false"/""), check the binary
  if (server && server !== "true" && server !== "false") {
    const serverBin = server.split(" ")[0]!;
    await ensureCommand(serverBin);
  }

  const dirName = basename(targetDir).replace(/[^a-zA-Z0-9_-]/g, "_");
  const sessionName = `tp-${dirName}`;

  // If session already exists, just re-attach
  try {
    execSync(`tmux has-session -t "${sessionName}"`, { stdio: "ignore" });
    console.log(`Attaching to existing session: ${sessionName}`);
    execSync(`tmux attach-session -t "${sessionName}"`, { stdio: "inherit" });
    return;
  } catch {
    // Session doesn't exist — create it below
  }

  buildSession(sessionName, targetDir);

  try {
    execSync(`tmux attach-session -t "${sessionName}"`, { stdio: "inherit" });
  } catch {
    // tmux exited (user detached / closed) — that's fine
  }
}
