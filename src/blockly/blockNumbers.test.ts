import * as Blockly from "blockly/core";
import "blockly/blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { BlockNumberIcon } from "@/blockly/BlockNumberIcon";
import { findBlockByNumber, getBlockNumber, numberBlocks } from "@/blockly/blockNumbers";
import { initBlocklyLocale } from "@/blockly/locale";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
});

describe("numberBlocks", () => {
  it("numbers from one, in workspace order", () => {
    workspace.newBlock("controls_repeat_ext");
    workspace.newBlock("text_print");

    numberBlocks(workspace);

    expect(workspace.getAllBlocks(true).map(getBlockNumber)).toEqual([1, 2]);
  });

  it("numbers nested blocks too, so anything on screen can be named", () => {
    const loop = workspace.newBlock("controls_repeat_ext");
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

    const second = workspace.newBlock("controls_repeat_ext");
    numberBlocks(workspace);
    numberBlocks(workspace);

    expect(first.getIcons()).toHaveLength(1);
    expect(second.getIcons()).toHaveLength(1);
  });

  it("closes the gap when a block is deleted", () => {
    const first = workspace.newBlock("controls_repeat_ext");
    const second = workspace.newBlock("text_print");
    const third = workspace.newBlock("math_number");
    numberBlocks(workspace);

    second.dispose(false);
    numberBlocks(workspace);

    // Numbers must stay contiguous, or a badge points at nothing.
    const remaining = [getBlockNumber(first), getBlockNumber(third)];
    expect(remaining).toContain(1);
    expect(remaining).toContain(2);
  });
});

describe("findBlockByNumber", () => {
  it("finds the block wearing a number", () => {
    workspace.newBlock("controls_repeat_ext");
    const print = workspace.newBlock("text_print");
    numberBlocks(workspace);

    const found = findBlockByNumber(workspace, getBlockNumber(print) ?? 0);

    expect(found?.id).toBe(print.id);
  });

  it("returns nothing for a number no block wears", () => {
    workspace.newBlock("text_print");
    numberBlocks(workspace);

    expect(findBlockByNumber(workspace, 7)).toBeNull();
    expect(findBlockByNumber(workspace, 0)).toBeNull();
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
