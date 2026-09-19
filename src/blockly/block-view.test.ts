import * as Blockly from "blockly/core";
import "blockly/blocks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BlockNumberIcon } from "@/blockly/block-number-icon";
import { getBlockNumber, numberBlocks, revealBlock } from "@/blockly/block-view";
import { initBlocklyLocale } from "@/blockly/locale";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
});

describe("numberBlocks", () => {
  it("numbers from one, in workspace order", () => {
    workspace.newBlock("controls_repeat");
    workspace.newBlock("text_print");

    numberBlocks(workspace);

    expect(workspace.getAllBlocks(true).map(getBlockNumber)).toEqual([1, 2]);
  });

  it("numbers nested blocks too, so anything on screen can be named", () => {
    const loop = workspace.newBlock("controls_repeat");
    const print = workspace.newBlock("text_print");
    const input = loop.getInput("DO")?.connection;
    if (!input || !print.previousConnection) throw new Error("block shape changed");
    input.connect(print.previousConnection);

    numberBlocks(workspace);

    expect(getBlockNumber(print)).not.toBeNull();
    expect(getBlockNumber(loop)).not.toBe(getBlockNumber(print));
  });

  it("renumbers rather than stacking a second badge on a block", () => {
    const first = workspace.newBlock("text_print");
    numberBlocks(workspace);

    const second = workspace.newBlock("controls_repeat");
    numberBlocks(workspace);
    numberBlocks(workspace);

    expect(first.getIcons()).toHaveLength(1);
    expect(second.getIcons()).toHaveLength(1);
  });

  it("closes the gap when a block is deleted", () => {
    const first = workspace.newBlock("controls_repeat");
    const second = workspace.newBlock("text_print");
    const third = workspace.newBlock("controls_if");
    numberBlocks(workspace);

    second.dispose(false);
    numberBlocks(workspace);

    // Numbers must stay contiguous, or a badge points at nothing.
    const remaining = [getBlockNumber(first), getBlockNumber(third)];
    expect(remaining).toContain(1);
    expect(remaining).toContain(2);
  });
});

describe("badges on value blocks", () => {
  it("leaves a literal unbadged, because zelos draws its field over the block", () => {
    const number = workspace.newBlock("math_number");
    const text = workspace.newBlock("text");

    numberBlocks(workspace);

    expect(getBlockNumber(number)).toBeNull();
    expect(getBlockNumber(text)).toBeNull();
  });

  it("takes the badge away when a mutation removes the last value input", () => {
    // text_join at zero items swaps its value inputs for a dummy EMPTY one,
    // so it stops being badgeable while keeping the badge it already had.
    const join = workspace.newBlock("text_join");
    numberBlocks(workspace);
    expect(getBlockNumber(join)).toBe(1);

    join.loadExtraState?.({ itemCount: 0 });
    numberBlocks(workspace);

    expect(getBlockNumber(join)).toBeNull();
  });

  it("still badges a value block that takes blocks of its own", () => {
    const compare = workspace.newBlock("logic_compare");

    numberBlocks(workspace);

    expect(getBlockNumber(compare)).toBe(1);
  });
});

describe("the badge", () => {
  it("claims more width than it draws, so a value cannot sit against it", () => {
    const block = workspace.newBlock("math_number");
    const icon = new BlockNumberIcon(block);

    // On a number block the badge would otherwise read as a leading digit.
    const size = icon.getSize();
    expect(size.width).toBeGreaterThan(size.height);
  });
});

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
