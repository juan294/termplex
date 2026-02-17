export interface LayoutOptions {
  editor: string;
  editorPanes: number;
  editorSize: number;
  sidebarCommand: string;
  server: string;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  editor: "claude",
  editorPanes: 3,
  editorSize: 75,
  sidebarCommand: "lazygit",
  server: "true",
};

export interface LayoutPlan {
  editorSize: number;
  sidebarSize: number;
  leftColumnCount: number;
  rightColumnEditorCount: number;
  editor: string;
  sidebarCommand: string;
  hasServer: boolean;
  serverCommand: string | null;
}

function parseServer(value: string): { hasServer: boolean; serverCommand: string | null } {
  if (value === "false" || value === "") {
    return { hasServer: false, serverCommand: null };
  }
  if (value === "true") {
    return { hasServer: true, serverCommand: null };
  }
  return { hasServer: true, serverCommand: value };
}

export function planLayout(partial?: Partial<LayoutOptions>): LayoutPlan {
  const opts = { ...DEFAULT_OPTIONS, ...partial };
  const leftColumnCount = Math.ceil(opts.editorPanes / 2);
  const { hasServer, serverCommand } = parseServer(opts.server);
  return {
    editorSize: opts.editorSize,
    sidebarSize: 100 - opts.editorSize,
    leftColumnCount,
    rightColumnEditorCount: opts.editorPanes - leftColumnCount,
    editor: opts.editor,
    sidebarCommand: opts.sidebarCommand,
    hasServer,
    serverCommand,
  };
}
