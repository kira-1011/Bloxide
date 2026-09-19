import * as Blockly from "blockly/core";
import "blockly/blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { findBlockByNumber } from "@/blockly/blockReference";
import { getBlockNumber, numberBlocks } from "@/blockly/blockView";
import { initBlocklyLocale } from "@/blockly/locale";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
});

function numberOf(block: Blockly.Block): number {
  const number = getBlockNumber(block);
  if (number === null) throw new Error("block has no number");
  return number;
}

describe("findBlockByNumber", () => {
  it("finds the block wearing a number", () => {
    workspace.newBlock("controls_repeat_ext");
    const print = workspace.newBlock("text_print");
    numberBlocks(workspace);

    const found = findBlockByNumber(workspace, numberOf(print));

    expect(found?.id).toBe(print.id);
  });

  it("returns nothing for a number no block wears", () => {
    workspace.newBlock("text_print");
    numberBlocks(workspace);

    expect(findBlockByNumber(workspace, 7)).toBeNull();
    expect(findBlockByNumber(workspace, 0)).toBeNull();
  });
});
