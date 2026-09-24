import { fireEvent, render, screen } from "@testing-library/react";
import * as Blockly from "blockly/core";
import { afterEach, describe, expect, it } from "vitest";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { WorkspaceControls } from "@/blockly/workspace-controls";

afterEach(() => setActiveWorkspace(null));

/** A headless workspace stands in for the injected one: the handlers only ever
    ask it about blocks and history, never about how it is drawn. */
function openWorkspace(): Blockly.WorkspaceSvg {
  const workspace = new Blockly.Workspace() as Blockly.WorkspaceSvg;
  setActiveWorkspace(workspace);
  return workspace;
}

describe("WorkspaceControls", () => {
  it("offers undo, zoom and delete as buttons with names, not bare icons", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    for (const name of [
      "Undo the last change",
      "Zoom in",
      "Zoom out",
      "Back to normal size",
      "Delete the chosen block",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("asks for a block when nothing is chosen, rather than deleting nothing silently", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete the chosen block" }));

    expect(screen.getByRole("status")).toHaveTextContent("Pick a block first");
  });

  it("says undo changed nothing rather than leaving the child guessing", () => {
    const workspace = openWorkspace();
    render(<WorkspaceControls workspaceRef={{ current: workspace }} />);

    fireEvent.click(screen.getByRole("button", { name: "Undo the last change" }));

    expect(screen.getByRole("status")).toHaveTextContent("There is nothing to undo.");
  });

  it("does nothing on undo or zoom before the workspace has opened", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    expect(() =>
      fireEvent.click(screen.getByRole("button", { name: "Undo the last change" })),
    ).not.toThrow();
  });

  it("does nothing on zoom before the workspace has opened", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))).not.toThrow();
  });
});
