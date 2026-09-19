import type * as Blockly from "blockly/core";
import { describe, expect, it, vi } from "vitest";
import { revealBlock } from "@/blockly/reveal";

const VIEW = { left: 0, top: 0, width: 800, height: 600 };

function workspaceWatching(centerOnBlock: (id: string) => void) {
  return {
    getMetricsManager: () => ({ getViewMetrics: () => VIEW }),
    centerOnBlock,
  } as unknown as Blockly.WorkspaceSvg;
}

function blockAt(left: number, top: number) {
  return {
    id: "block",
    getBoundingRectangle: () => ({ left, top, right: left + 100, bottom: top + 40 }),
  } as unknown as Blockly.BlockSvg;
}

describe("revealBlock", () => {
  it("centres a block that sits above the viewport", () => {
    const centre = vi.fn();

    revealBlock(workspaceWatching(centre), blockAt(0, -900));

    expect(centre).toHaveBeenCalledWith("block");
  });

  it("centres a block that sits below the viewport", () => {
    const centre = vi.fn();

    revealBlock(workspaceWatching(centre), blockAt(0, 900));

    expect(centre).toHaveBeenCalledWith("block");
  });

  it("leaves the workspace alone when the block is already in view", () => {
    const centre = vi.fn();

    revealBlock(workspaceWatching(centre), blockAt(100, 100));

    // Recentring here would move the workspace under someone reading it.
    expect(centre).not.toHaveBeenCalled();
  });

  it("counts a block straddling the edge as visible", () => {
    const centre = vi.fn();

    revealBlock(workspaceWatching(centre), blockAt(-50, 580));

    expect(centre).not.toHaveBeenCalled();
  });
});
