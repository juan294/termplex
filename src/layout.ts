export interface LayoutOptions {
  editor: string;
  editorPanes: number;
  editorSize: number;
  sidebarCommand: string;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  editor: "claude",
  editorPanes: 3,
  editorSize: 75,
  sidebarCommand: "lazygit",
};

export interface LayoutPlan {
  editorSize: number;
  sidebarSize: number;
  leftColumnCount: number;
  rightColumnEditorCount: number;
  editor: string;
  sidebarCommand: string;
}

export function planLayout(partial?: Partial<LayoutOptions>): LayoutPlan {
  const opts = { ...DEFAULT_OPTIONS, ...partial };
  const leftColumnCount = Math.ceil(opts.editorPanes / 2);
  return {
    editorSize: opts.editorSize,
    sidebarSize: 100 - opts.editorSize,
    leftColumnCount,
    rightColumnEditorCount: opts.editorPanes - leftColumnCount,
    editor: opts.editor,
    sidebarCommand: opts.sidebarCommand,
  };
}
