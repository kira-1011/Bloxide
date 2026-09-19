import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActiveWorkspace } from "@/blockly/activeWorkspace";
import { getBlockNumber, numberBlocks } from "@/blockly/blockNumbers";
import { initBlocklyLocale } from "@/blockly/locale";
import {
  addBlock,
  attachBlock,
  deleteBlock,
  haltProgram,
  startProgram,
  VOICE_ACTIONS,
} from "@/voice/handlers";
import { getRunState, isProgramRunning } from "@/run/runner";
import { BLOCK_TYPES } from "@/blockly/toolbox";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
  setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
});

afterEach(() => {
  setActiveWorkspace(null);
});

describe("addBlock", () => {
  it("offers the model the toolbox types to choose from", () => {
    // Without the enum the model passes the child's word — "repeat" — through.
    expect(VOICE_ACTIONS.addBlock?.params?.type?.enum).toEqual([...BLOCK_TYPES]);
    expect(BLOCK_TYPES).toContain("controls_repeat_ext");
  });

  it("adds the block the agent asked for", async () => {
    const spoken = await addBlock({ type: "controls_repeat_ext" });

    expect(workspace.getAllBlocks(false)).toHaveLength(1);
    expect(workspace.getAllBlocks(false)[0]?.type).toBe("controls_repeat_ext");
    expect(spoken).toContain("Added");
  });

  it("refuses a real Blockly block we do not ship", async () => {
    // text_join is in Blockly's registry but not our toolbox. Checking the
    // registry instead of the toolbox would quietly add it.
    const spoken = await addBlock({ type: "text_join" });

    expect(spoken).toBe("I do not know a block called text_join.");
    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it("accepts what a child says, not just the type id", async () => {
    // The enum steers the model to type ids but enforces nothing, so "repeat"
    // still arrives sometimes and must not dead-end.
    await addBlock({ type: "repeat" });

    expect(workspace.getAllBlocks(false)[0]?.type).toBe("controls_repeat_ext");
  });

  it('ignores casing and a trailing "block"', async () => {
    await addBlock({ type: "Print Block" });

    expect(workspace.getAllBlocks(false)[0]?.type).toBe("text_print");
  });

  it("says so instead of throwing when nothing matches", async () => {
    const spoken = await addBlock({ type: "unicorn" });

    expect(spoken).toBe("I do not know a block called unicorn.");
    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it("refuses when no workspace is open", async () => {
    setActiveWorkspace(null);

    await expect(addBlock({ type: "text_print" })).rejects.toThrow("No workspace is open yet.");
  });
});

describe("attachBlock", () => {
  it("puts a statement block inside a loop", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });

    // No type given: the print block was just added, so it is the target.
    const spoken = await attachBlock({ to: "repeat" });

    const loop = workspace.getBlocksByType("controls_repeat_ext", false)[0];
    expect(loop?.getChildren(false).map((child) => child.type)).toContain("text_print");
    expect(spoken).toContain("inside");
  });

  it("puts a value block into an open socket", async () => {
    await addBlock({ type: "text_print" });
    await addBlock({ type: "text" });

    await attachBlock({ to: "print" });

    const print = workspace.getBlocksByType("text_print", false)[0];
    expect(print?.getChildren(false).map((child) => child.type)).toContain("text");
  });

  it("says so when the blocks do not fit together", async () => {
    await addBlock({ type: "text" });
    await addBlock({ type: "math_number" });

    const spoken = await attachBlock({ to: "text" });

    expect(spoken).toContain("does not fit");
  });

  it("nests one block inside another of the same type", async () => {
    // The target must not resolve to the very block being moved.
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "controls_repeat_ext" });

    const spoken = await attachBlock({ to: "repeat" });

    expect(spoken).toContain("inside");
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
  });

  it("refuses to attach a block to itself", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    const spoken = await attachBlock({ to: "repeat" });

    expect(spoken).toBe("A block cannot be attached to itself.");
  });
});

describe("deleteBlock", () => {
  it("deletes the block just added when no type is given", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    const spoken = deleteBlock({});

    expect(workspace.getAllBlocks(false)).toHaveLength(0);
    expect(spoken).toContain("controls_repeat_ext");
  });

  it("deletes a named block", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });

    deleteBlock({ type: "repeat" });

    expect(workspace.getAllBlocks(false).map((block) => block.type)).toEqual(["text_print"]);
  });

  it("says so when there is nothing to delete", () => {
    expect(deleteBlock({ type: "repeat" })).toBe("I cannot find a repeat block.");
  });
});

describe("run and stop", () => {
  it("refuses to run an empty workspace", () => {
    expect(startProgram()).toBe("There are no blocks to run yet.");
  });

  it("starts the program without waiting for it to finish", async () => {
    await addBlock({ type: "text_print" });

    const spoken = startProgram();

    expect(spoken).toBe("Running your program");
    // The handler returns immediately; the run is still in flight.
    expect(isProgramRunning()).toBe(true);
    await vi.waitFor(() => expect(isProgramRunning()).toBe(false));
    expect(getRunState().output).toHaveLength(1);
  });

  it("says so when stopping with nothing running", () => {
    expect(haltProgram()).toBe("Nothing is running.");
  });
});

describe("referring by number", () => {
  it("deletes the block wearing the number, not the last one touched", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });
    numberBlocks(workspace);
    const loop = workspace.getBlocksByType("controls_repeat_ext", false)[0];
    const number = getBlockNumber(loop!) ?? 0;

    const spoken = deleteBlock({ number });

    expect(spoken).toContain("controls_repeat_ext");
    expect(workspace.getAllBlocks(false).map((block) => block.type)).toEqual(["text_print"]);
  });

  it("beats a type name when both are given", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });
    numberBlocks(workspace);
    const print = workspace.getBlocksByType("text_print", false)[0];

    // A misheard type with the right number still lands on the right block.
    const spoken = deleteBlock({ number: getBlockNumber(print!) ?? 0, type: "repeat" });

    expect(spoken).toContain("text_print");
  });

  it("says so when no block wears that number", async () => {
    await addBlock({ type: "text_print" });
    numberBlocks(workspace);

    expect(deleteBlock({ number: 9 })).toBe("There is no block 9.");
  });

  it("attaches by number, including two blocks of the same type", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "controls_repeat_ext" });
    numberBlocks(workspace);
    const loops = workspace.getBlocksByType("controls_repeat_ext", true);
    const [outer, inner] = [loops[0], loops[1]];

    const spoken = await attachBlock({
      number: getBlockNumber(inner!) ?? 0,
      toNumber: getBlockNumber(outer!) ?? 0,
    });

    expect(spoken).toContain("inside");
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
  });
});

describe("numbers stay usable without waiting for Blockly's events", () => {
  it("numbers a new block before the handler returns", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    // Blockly queues its create event; a spoken number must work right away.
    expect(workspace.getAllBlocks(true).map(getBlockNumber)).toEqual([1]);
  });

  it("renumbers after an attach, so a badge is never stale", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });
    await attachBlock({ to: "repeat" });

    const numbers = workspace.getAllBlocks(true).map(getBlockNumber);
    expect(numbers).toEqual([1, 2]);
  });

  it("closes the gap after a delete before returning", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });
    await addBlock({ type: "controls_if" });

    deleteBlock({ number: 2 });

    expect(workspace.getAllBlocks(true).map(getBlockNumber)).toEqual([1, 2]);
  });

  it("finds a block by the badge it wears, not by its position", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "text_print" });
    const print = workspace.getBlocksByType("text_print", false)[0];
    const badge = getBlockNumber(print!) ?? 0;

    const spoken = deleteBlock({ number: badge });

    expect(spoken).toContain("text_print");
  });
});
