import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { getBlockNumber } from "@/blockly/block-view";
import { initBlocklyLocale } from "@/blockly/locale";
import {
  addBlock,
  attachBlock,
  deleteBlocks,
  redoEdit,
  setParam,
  undoEdit,
  VOICE_ACTIONS,
} from "@/voice/handlers";

initBlocklyLocale();

let workspace: Blockly.Workspace;

// Blockly dispatches its queued events on the next animation frame, and the
// undo stack is filled as they are dispatched. jsdom never turns a frame, so
// here the frame is a timer we advance by hand. A browser turns its own, which
// is why only the tests need this.
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );

  workspace = new Blockly.Workspace();
  setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
});

// Drained before the clock goes back, or a queue left full would keep Blockly
// from scheduling another frame and the next test would record nothing.
afterEach(async () => {
  await settle();
  setActiveWorkspace(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Lets Blockly's event queue drain, which is what records the edit. */
async function settle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(50);
}

/** The blocks someone put there, without the shadows filling their slots. */
function program(): string[] {
  return workspace
    .getAllBlocks(true)
    .filter((block) => !block.isShadow())
    .map((block) => block.toString());
}

function firstOfType(type: string): Blockly.Block | undefined {
  return workspace.getBlocksByType(type, false)[0];
}

/** What a slot holds, which is where a value lives now. */
function slotValue(type: string, input: string): unknown {
  return firstOfType(type)?.getInputTargetBlock(input)?.getFieldValue("NUM");
}

describe("undo", () => {
  it("says so rather than staying silent when there is nothing to take back", async () => {
    await settle();

    expect(undoEdit()).toBe("There is nothing to undo.");
    expect(program()).toEqual([]);
  });

  it("takes back a block that was just added", async () => {
    addBlock({ type: "move" });
    await settle();

    expect(undoEdit()).toBe("Undone. The workspace is empty.");
    expect(program()).toEqual([]);
  });

  it("puts the old value back after a change", async () => {
    addBlock({ type: "move" });
    await settle();
    setParam({ value: "40" });
    await settle();
    expect(slotValue("bloxide_move", "STEPS")).toBe(40);

    expect(undoEdit()).toBe("Undone. 1 block left, numbered from one.");
    expect(slotValue("bloxide_move", "STEPS")).toBe(10);
  });

  // One sentence emptied the workspace, so one sentence has to fill it again: a
  // child whose program went to a misheard word cannot be left guessing how
  // many times to say it.
  it("brings a whole deleted program back in one step", async () => {
    addBlock({ type: "move" });
    await settle();
    addBlock({ type: "turn right" });
    await settle();
    addBlock({ type: "wait" });
    await settle();
    const before = program();

    deleteBlocks({ numbers: "1, 2, 3" });
    await settle();
    expect(program()).toEqual([]);

    expect(undoEdit()).toBe("Undone. 3 blocks left, numbered from one.");
    // As a set: what matters is that every block is back, not the order Blockly
    // happens to replay them in.
    expect(new Set(program())).toEqual(new Set(before));
  });

  it("brings back a block that was deleted from inside a stack, still attached", async () => {
    addBlock({ type: "repeat" });
    await settle();
    addBlock({ type: "move" });
    await settle();
    attachBlock({ to: "repeat", number: 2 });
    await settle();

    deleteBlocks({ number: 2 });
    await settle();
    expect(firstOfType("controls_repeat_ext")?.getInputTargetBlock("DO")).toBeNull();

    undoEdit();

    // Back where it was, not merely back on the workspace.
    expect(firstOfType("controls_repeat_ext")?.getInputTargetBlock("DO")?.type).toBe(
      "bloxide_move",
    );
  });

  it("walks back one edit at a time when it is said again", async () => {
    addBlock({ type: "move" });
    await settle();
    addBlock({ type: "turn right" });
    await settle();

    undoEdit();
    await settle();
    expect(program()).toEqual(["move 10 steps"]);

    undoEdit();
    await settle();
    expect(program()).toEqual([]);

    expect(undoEdit()).toBe("There is nothing to undo.");
  });

  it("renumbers what it brings back, so the badge can be spoken straight away", async () => {
    addBlock({ type: "move" });
    await settle();
    deleteBlocks({ number: 1 });
    await settle();

    undoEdit();

    const restored = firstOfType("bloxide_move");
    expect(restored && getBlockNumber(restored)).toBe(1);
  });

  it("stops 'it' meaning a block it has just undone away", async () => {
    addBlock({ type: "move" });
    await settle();
    undoEdit();
    await settle();

    expect(setParam({ value: "20" })).toBe("I am not sure which block you mean.");
  });
});

describe("redo", () => {
  it("says so when nothing has been undone", async () => {
    addBlock({ type: "move" });
    await settle();

    expect(redoEdit()).toBe("There is nothing to redo.");
    expect(program()).toEqual(["move 10 steps"]);
  });

  it("puts back what undo took away", async () => {
    addBlock({ type: "move" });
    await settle();
    undoEdit();
    await settle();

    expect(redoEdit()).toBe("Redone. 1 block left, numbered from one.");
    expect(program()).toEqual(["move 10 steps"]);
  });

  it("has nothing left to redo once a new edit has replaced the undone one", async () => {
    addBlock({ type: "move" });
    await settle();
    undoEdit();
    await settle();

    addBlock({ type: "wait" });
    await settle();

    expect(redoEdit()).toBe("There is nothing to redo.");
    expect(program()).toEqual(["wait 1 seconds"]);
  });
});

describe("the history capabilities", () => {
  it("asks for nothing, so a child only has to say the word", () => {
    expect(VOICE_ACTIONS.undo?.params).toBeUndefined();
    expect(VOICE_ACTIONS.redo?.params).toBeUndefined();
  });

  it("tells the agent undo is what recovers a wrong delete", () => {
    expect(VOICE_ACTIONS.undo?.description).toContain("deleted");
  });
});
