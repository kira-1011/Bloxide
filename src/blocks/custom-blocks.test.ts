import * as Blockly from "blockly/core";
import "blockly/blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { REPEAT_BLOCK_TYPE, SPRITE_BLOCK_TYPES } from "@/blocks/custom-blocks";
import { initBlocklyLocale } from "@/blockly/locale";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
});

describe("sprite blocks", () => {
  it("defines the twelve blocks DESIGN.md names", () => {
    expect(SPRITE_BLOCK_TYPES).toHaveLength(12);
    for (const type of SPRITE_BLOCK_TYPES) {
      expect(Blockly.Blocks[type], `${type} is not registered`).toBeDefined();
    }
  });

  it("borrows repeat from Blockly rather than redefining it", () => {
    expect(SPRITE_BLOCK_TYPES).toContain(REPEAT_BLOCK_TYPE);
    expect(workspace.newBlock(REPEAT_BLOCK_TYPE).getInput("TIMES")).not.toBeNull();
  });

  it("holds no editable field of its own, so values live in slots", () => {
    for (const type of SPRITE_BLOCK_TYPES) {
      const fields = workspace
        .newBlock(type)
        .inputList.flatMap((input) => input.fieldRow.filter((field) => field.EDITABLE));
      expect(fields, `${type} has an inline field`).toHaveLength(0);
    }
  });

  it("stacks every block, and caps forever so nothing follows it", () => {
    for (const type of SPRITE_BLOCK_TYPES) {
      const block = workspace.newBlock(type);
      expect(block.previousConnection, `${type} cannot be stacked under`).not.toBeNull();
    }
    expect(workspace.newBlock("bloxide_forever").nextConnection).toBeNull();
    expect(workspace.newBlock("bloxide_wait").nextConnection).not.toBeNull();
  });

  it("gives the C blocks somewhere to put the blocks inside", () => {
    expect(workspace.newBlock("bloxide_forever").getInput("DO")).not.toBeNull();
  });

  it("names a style per category rather than a colour", () => {
    expect(workspace.newBlock("bloxide_move").getStyleName()).toBe("movement_blocks");
    expect(workspace.newBlock("bloxide_say").getStyleName()).toBe("say_blocks");
    expect(workspace.newBlock("bloxide_hide").getStyleName()).toBe("look_blocks");
    expect(workspace.newBlock("bloxide_wait").getStyleName()).toBe("control_blocks");
  });
});
