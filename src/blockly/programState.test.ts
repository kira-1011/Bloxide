import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActiveWorkspace } from "@/blockly/activeWorkspace";
import { initBlocklyLocale } from "@/blockly/locale";
import { describeProgram } from "@/blockly/programState";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
  setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
});

afterEach(() => {
  setActiveWorkspace(null);
});

describe("describeProgram", () => {
  it("reports an empty workspace as empty", () => {
    expect(describeProgram()).toEqual({ running: false, blockCount: 0, stacks: [], numbered: [] });
  });

  it("describes nothing when no workspace is open", () => {
    setActiveWorkspace(null);

    expect(describeProgram().blockCount).toBe(0);
  });

  it("counts every block but sends one entry per stack", () => {
    workspace.newBlock("controls_repeat_ext");
    workspace.newBlock("text_print");

    const { blockCount, stacks } = describeProgram();

    expect(blockCount).toBe(2);
    expect(stacks).toHaveLength(2);
    expect(stacks.map((stack) => stack.type)).toContain("text_print");
  });

  it("keeps nesting, because that is what the agent has to reason about", () => {
    const loop = workspace.newBlock("controls_repeat_ext");
    const print = workspace.newBlock("text_print");
    const input = loop.getInput("DO")?.connection;
    if (!input || !print.previousConnection) throw new Error("block shape changed");
    input.connect(print.previousConnection);

    const { stacks } = describeProgram();

    expect(stacks).toHaveLength(1);
    expect(stacks[0]?.type).toBe("controls_repeat_ext");
    expect(stacks[0]?.inputs?.["DO"]?.block?.type).toBe("text_print");
  });

  it("leaves out ids and coordinates", () => {
    workspace.newBlock("text_print");

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
