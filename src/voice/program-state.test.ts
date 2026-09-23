import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { initBlocklyLocale } from "@/blockly/locale";
import { describeProgram } from "@/voice/program-state";
import { moveSteps, resetSprite, turnDegrees } from "@/sprite/sprite-store";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
  setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
  resetSprite();
});

afterEach(() => {
  setActiveWorkspace(null);
});

describe("describeProgram", () => {
  it("reports an empty workspace as empty", () => {
    expect(describeProgram()).toMatchObject({
      running: false,
      blockCount: 0,
      stacks: [],
      numbered: [],
    });
  });

  it("describes nothing when no workspace is open", () => {
    setActiveWorkspace(null);

    expect(describeProgram().blockCount).toBe(0);
  });

  it("says where the sprite is, with or without a workspace", () => {
    moveSteps(40);

    expect(describeProgram().sprite).toMatchObject({ x: 40, y: 0, direction: 90, visible: true });

    setActiveWorkspace(null);

    // The sprite outlives the workspace; reporting a default one here would
    // tell the agent it is somewhere it is not.
    expect(describeProgram().sprite.x).toBe(40);
  });

  it("rounds the sprite's position rather than speaking sub-pixels", () => {
    turnDegrees(-45);
    moveSteps(10);

    expect(Number.isInteger(describeProgram().sprite.x)).toBe(true);
    expect(Number.isInteger(describeProgram().sprite.y)).toBe(true);
  });

  it("counts every block but sends one entry per stack", () => {
    workspace.newBlock("controls_repeat_ext");
    workspace.newBlock("bloxide_say");

    const { blockCount, stacks } = describeProgram();

    expect(blockCount).toBe(2);
    expect(stacks).toHaveLength(2);
    expect(stacks.map((stack) => stack.type)).toContain("bloxide_say");
  });

  it("counts the blocks someone put there, not the shadows in their slots", () => {
    // A go to carries two shadows; counting them would report three blocks for
    // one, and the agent would say so out loud.
    Blockly.serialization.blocks.append(
      {
        type: "bloxide_go_to",
        inputs: {
          X: { shadow: { type: "math_number", fields: { NUM: 0 } } },
          Y: { shadow: { type: "math_number", fields: { NUM: 0 } } },
        },
      },
      workspace,
    );

    expect(workspace.getAllBlocks(false)).toHaveLength(3);
    expect(describeProgram().blockCount).toBe(1);
  });

  it("keeps nesting, because that is what the agent has to reason about", () => {
    const loop = workspace.newBlock("controls_repeat_ext");
    const say = workspace.newBlock("bloxide_say");
    const input = loop.getInput("DO")?.connection;
    if (!input || !say.previousConnection) throw new Error("block shape changed");
    input.connect(say.previousConnection);

    const { stacks } = describeProgram();

    expect(stacks).toHaveLength(1);
    expect(stacks[0]?.type).toBe("controls_repeat_ext");
    expect(stacks[0]?.inputs?.["DO"]?.block?.type).toBe("bloxide_say");
  });

  it("leaves out ids and coordinates", () => {
    workspace.newBlock("bloxide_say");

    const [stack] = describeProgram().stacks;

    expect(stack?.id).toBeUndefined();
    expect(stack?.x).toBeUndefined();
    expect(stack?.y).toBeUndefined();
  });

  it("carries field values, so the agent knows what a block is set to", () => {
    const number = workspace.newBlock("math_number");
    number.setFieldValue("42", "NUM");

    const [stack] = describeProgram().stacks;

    expect(stack?.fields?.["NUM"]).toBe(42);
  });
});
