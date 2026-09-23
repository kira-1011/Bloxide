import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { findBlockByNumber } from "@/blockly/block-reference";
import { getBlockNumber, numberBlocks } from "@/blockly/block-view";
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
    const say = workspace.newBlock("bloxide_say");
    numberBlocks(workspace);

    const found = findBlockByNumber(workspace, numberOf(say));

    expect(found?.id).toBe(say.id);
  });

  it("returns nothing for a number no block wears", () => {
    workspace.newBlock("bloxide_say");
    numberBlocks(workspace);

    expect(findBlockByNumber(workspace, 7)).toBeNull();
    expect(findBlockByNumber(workspace, 0)).toBeNull();
  });
});
