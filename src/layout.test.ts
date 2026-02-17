import { describe, it, expect } from "vitest";
import { planLayout } from "./layout.js";

describe("planLayout", () => {
  it("returns defaults when called with no options", () => {
    const plan = planLayout();
    expect(plan.editor).toBe("claude");
    expect(plan.sidebarCommand).toBe("lazygit");
    expect(plan.editorSize).toBe(75);
    expect(plan.sidebarSize).toBe(25);
  });

  it("calculates sidebar size as complement of editor size", () => {
    const plan = planLayout({ editorSize: 80 });
    expect(plan.editorSize).toBe(80);
    expect(plan.sidebarSize).toBe(20);
  });

  it("splits 1 pane: 1 left, 0 right", () => {
    const plan = planLayout({ editorPanes: 1 });
    expect(plan.leftColumnCount).toBe(1);
    expect(plan.rightColumnEditorCount).toBe(0);
  });

  it("splits 2 panes: 1 left, 1 right", () => {
    const plan = planLayout({ editorPanes: 2 });
    expect(plan.leftColumnCount).toBe(1);
    expect(plan.rightColumnEditorCount).toBe(1);
  });

  it("splits 3 panes: 2 left, 1 right", () => {
    const plan = planLayout({ editorPanes: 3 });
    expect(plan.leftColumnCount).toBe(2);
    expect(plan.rightColumnEditorCount).toBe(1);
  });

  it("splits 4 panes: 2 left, 2 right", () => {
    const plan = planLayout({ editorPanes: 4 });
    expect(plan.leftColumnCount).toBe(2);
    expect(plan.rightColumnEditorCount).toBe(2);
  });

  it("splits 5 panes: 3 left, 2 right", () => {
    const plan = planLayout({ editorPanes: 5 });
    expect(plan.leftColumnCount).toBe(3);
    expect(plan.rightColumnEditorCount).toBe(2);
  });

  it("splits 6 panes: 3 left, 3 right", () => {
    const plan = planLayout({ editorPanes: 6 });
    expect(plan.leftColumnCount).toBe(3);
    expect(plan.rightColumnEditorCount).toBe(3);
  });

  it("overrides editor and sidebar commands", () => {
    const plan = planLayout({ editor: "vim", sidebarCommand: "htop" });
    expect(plan.editor).toBe("vim");
    expect(plan.sidebarCommand).toBe("htop");
  });

  it("handles empty editor string", () => {
    const plan = planLayout({ editor: "" });
    expect(plan.editor).toBe("");
  });
});
