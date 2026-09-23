import * as Blockly from "blockly/core";
import "@/blocks/custom-blocks";
import { describe, expect, it } from "vitest";
import { initBlocklyLocale } from "@/blockly/locale";
import { WORKSPACE_OPTIONS } from "@/blockly/options";
import { RENDERER_NAME } from "@/blockly/renderer";
import { BLOXIDE_THEME } from "@/blockly/theme";

initBlocklyLocale();

describe("the Bloxide renderer", () => {
  it("is what the workspace is injected with", () => {
    expect(Blockly.registry.hasItem(Blockly.registry.Type.RENDERER, RENDERER_NAME)).toBe(true);
    expect(WORKSPACE_OPTIONS.renderer).toBe(RENDERER_NAME);
  });

  it("draws round corners and keeps the puzzle notch", () => {
    const constants = Blockly.blockRendering.init(RENDERER_NAME, BLOXIDE_THEME).getConstants();

    expect(constants.CORNER_RADIUS).toBe(16);
    expect(constants.NOTCH.height).toBeGreaterThan(0);
  });

  it("still lets blocks join under and inside each other", () => {
    const workspace = new Blockly.Workspace();
    const repeat = workspace.newBlock("controls_repeat_ext");
    const move = workspace.newBlock("bloxide_move");
    const say = workspace.newBlock("bloxide_say");

    const inside = repeat.getInput("DO")?.connection;
    if (!inside || !move.previousConnection || !move.nextConnection || !say.previousConnection) {
      throw new Error("a statement block lost a connection");
    }

    expect(inside.connect(move.previousConnection)).toBe(true);
    expect(move.nextConnection.connect(say.previousConnection)).toBe(true);

    expect(move.getSurroundParent()).toBe(repeat);
    expect(say.getPreviousBlock()).toBe(move);
  });
});
