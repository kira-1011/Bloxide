import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import { beforeEach, describe, expect, it } from "vitest";
import { REPEAT_BLOCK_TYPE, SPRITE_BLOCK_TYPES } from "@/blocks/sprite-blocks";
import "@/blocks/sprite-generators";
import { initBlocklyLocale } from "@/blockly/locale";

initBlocklyLocale();

// What the runner sets before generating, and what makes a loop interruptible.
const LOOP_TRAP = "await __tick();\n";

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
  javascriptGenerator.INFINITE_LOOP_TRAP = LOOP_TRAP;
});

/** One block on an empty workspace, so the code is only ever that block's. */
function codeFor(type: string, build?: (block: Blockly.Block) => void): string {
  workspace = new Blockly.Workspace();
  const block = workspace.newBlock(type);
  build?.(block);
  return javascriptGenerator.workspaceToCode(workspace);
}

/** Throws rather than asserting non-null: a missing slot is a failing test. */
function plugInto(block: Blockly.Block, input: string, child: Blockly.Connection | null): void {
  const slot = block.getInput(input)?.connection;
  if (!slot || !child) throw new Error(`no ${input} slot on ${block.type}`);
  slot.connect(child);
}

function fill(block: Blockly.Block, input: string, value: number): void {
  const number = block.workspace.newBlock("math_number");
  number.setFieldValue(value, "NUM");
  plugInto(block, input, number.outputConnection);
}

describe("sprite generators", () => {
  it("gives every block a generator", () => {
    for (const type of SPRITE_BLOCK_TYPES) {
      expect(javascriptGenerator.forBlock[type], `${type} has no generator`).toBeDefined();
    }
  });

  it("drives the sprite through the one injected name", () => {
    expect(codeFor("bloxide_move", (block) => fill(block, "STEPS", 50))).toBe(
      "await __sprite.move(50);\n",
    );
  });

  it("turns left by negating the same call", () => {
    expect(codeFor("bloxide_turn_left", (block) => fill(block, "DEGREES", 15))).toBe(
      "await __sprite.turn(-(15));\n",
    );
  });

  it("passes both slots of go to, in order", () => {
    expect(
      codeFor("bloxide_go_to", (block) => {
        fill(block, "X", 30);
        fill(block, "Y", -40);
      }),
    ).toBe("await __sprite.goTo(30, -40);\n");
  });

  it("stands in for an empty slot rather than emitting a syntax error", () => {
    expect(codeFor("bloxide_move")).toBe("await __sprite.move(0);\n");
    expect(codeFor("bloxide_say")).toBe('await __sprite.say("");\n');
  });

  it("shows and hides through one visibility call", () => {
    expect(codeFor("bloxide_hide")).toBe("await __sprite.setVisible(false);\n");
    expect(codeFor("bloxide_show")).toBe("await __sprite.setVisible(true);\n");
  });

  it("puts the loop trap inside forever, so Stop can still be heard", () => {
    // Without it this is `while (true)` with no yield and the tab locks up.
    const code = codeFor("bloxide_forever", (block) => {
      plugInto(block, "DO", workspace.newBlock("bloxide_move").previousConnection);
    });

    expect(code).toBe("while (true) {\n  await __tick();\n  await __sprite.move(0);\n}\n");
  });

  it("traps an empty forever too", () => {
    expect(codeFor("bloxide_forever")).toContain(LOOP_TRAP.trim());
  });

  it("traps the borrowed repeat as well", () => {
    const code = codeFor(REPEAT_BLOCK_TYPE, (block) => {
      fill(block, "TIMES", 3);
      plugInto(block, "DO", workspace.newBlock("bloxide_move").previousConnection);
    });

    expect(code).toContain(LOOP_TRAP.trim());
    expect(code).toContain("await __sprite.move(0);");
  });
});
