import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceControls } from "@/blockly/workspace-controls";

describe("WorkspaceControls", () => {
  it("offers zoom and delete as buttons with names, not bare icons", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    for (const name of ["Zoom in", "Zoom out", "Back to normal size", "Delete the chosen block"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("asks for a block when nothing is chosen, rather than deleting nothing silently", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete the chosen block" }));

    expect(screen.getByRole("status")).toHaveTextContent("Pick a block first");
  });

  it("does nothing on zoom before the workspace has opened", () => {
    render(<WorkspaceControls workspaceRef={{ current: null }} />);

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))).not.toThrow();
  });
});
