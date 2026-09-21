import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/sprite-blocks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { getBlockNumber, numberBlocks } from "@/blockly/block-view";
import { initBlocklyLocale } from "@/blockly/locale";
import {
  addBlock,
  attachBlock,
  deleteBlock,
  haltProgram,
  setParam,
  startProgram,
  VOICE_ACTIONS,
} from "@/voice/handlers";
import { isProgramRunning } from "@/run/runner";
import { getSpriteState, resetSprite, spriteStore } from "@/sprite/sprite-store";
import { BLOCK_NAMES, resolveBlockType } from "@/blockly/toolbox";

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

/** The blocks someone put there, without the shadows filling their slots. */
function ownBlocks(): Blockly.Block[] {
  return workspace.getAllBlocks(true).filter((block) => !block.isShadow());
}

/** What a slot holds, which is where a value lives now. */
function slotValue(block: Blockly.Block | undefined, input: string): unknown {
  const shadow = block?.getInputTargetBlock(input);
  return shadow?.getFieldValue(shadow.type === "text" ? "TEXT" : "NUM");
}

function firstOfType(type: string): Blockly.Block | undefined {
  return workspace.getBlocksByType(type, false)[0];
}

/** The badge a block is wearing, for saying it back. */
function badgeOf(type: string): number {
  const block = firstOfType(type);
  return block ? (getBlockNumber(block) ?? 0) : 0;
}

describe("addBlock", () => {
  it("offers the model words, not type ids, to choose from", () => {
    // Offered internal ids, the agent stopped calling addBlock at all and
    // claimed the block was added instead.
    expect(VOICE_ACTIONS.addBlock?.params?.type?.enum).toEqual([...BLOCK_NAMES]);
    expect(BLOCK_NAMES).toContain("move");
    expect(BLOCK_NAMES.some((name) => name.startsWith("bloxide_"))).toBe(false);
  });

  it("takes every word it offers", () => {
    // The enum and the resolver read the same list, so nothing can be offered
    // that would then be refused.
    for (const name of BLOCK_NAMES) {
      expect(resolveBlockType(name), name).not.toBeNull();
    }
  });

  it("fills every value input with a shadow, so no hole is left to drop into", async () => {
    // newBlock makes no shadows: a go to block would arrive with two empty
    // sockets, and filling one takes a mouse.
    await addBlock({ type: "bloxide_go_to" });

    const goTo = firstOfType("bloxide_go_to");
    expect(goTo?.getInputTargetBlock("X")?.isShadow()).toBe(true);
    expect(slotValue(goTo, "X")).toBe(0);
    expect(slotValue(goTo, "Y")).toBe(0);
  });

  it("adds the block the agent asked for", async () => {
    const spoken = await addBlock({ type: "bloxide_move" });

    expect(ownBlocks()).toHaveLength(1);
    expect(ownBlocks()[0]?.type).toBe("bloxide_move");
    expect(slotValue(ownBlocks()[0], "STEPS")).toBe(10);
    expect(spoken).toContain("Added");
  });

  it("says the block's name back, not its type id", async () => {
    // "Added a bloxide_move block" is not a sentence to say to a child.
    expect(await addBlock({ type: "bloxide_move" })).toBe("Added a move block");
    expect(await addBlock({ type: "controls_repeat_ext" })).toBe("Added a repeat block");
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

    expect(ownBlocks()[0]?.type).toBe("controls_repeat_ext");
  });

  it("sends say and show to the sprite, not to what those words used to mean", async () => {
    await addBlock({ type: "say" });
    await addBlock({ type: "show" });

    expect(ownBlocks().map((block) => block.type)).toEqual(["bloxide_say", "bloxide_show"]);
  });

  it("refuses a word two blocks would answer to", async () => {
    // "turn" would otherwise resolve to whichever turn block is listed first
    // and be confirmed as confidently as a right answer.
    const spoken = await addBlock({ type: "turn" });

    expect(spoken).toBe("I do not know a block called turn.");
    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it('ignores casing and a trailing "block"', async () => {
    await addBlock({ type: "Turn Left Block" });

    expect(ownBlocks()[0]?.type).toBe("bloxide_turn_left");
  });

  it("says so instead of throwing when nothing matches", async () => {
    const spoken = await addBlock({ type: "unicorn" });

    expect(spoken).toBe("I do not know a block called unicorn.");
    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it("refuses when no workspace is open", () => {
    setActiveWorkspace(null);

    expect(() => addBlock({ type: "bloxide_move" })).toThrow("No workspace is open yet.");
  });
});

describe("attachBlock", () => {
  it("puts a statement block inside a loop", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_move" });

    // No type given: the move block was just added, so it is the target.
    const spoken = await attachBlock({ to: "repeat" });

    const loop = firstOfType("controls_repeat_ext");
    expect(loop?.getChildren(false).map((child) => child.type)).toContain("bloxide_move");
    expect(spoken).toContain("inside");
  });

  it("names the block it attached to by its spoken name", async () => {
    await addBlock({ type: "bloxide_forever" });
    await addBlock({ type: "bloxide_say" });

    expect(await attachBlock({ to: "forever" })).toBe("Put it inside the forever block");
  });

  it("puts a block under one that takes nothing inside", async () => {
    await addBlock({ type: "bloxide_hide" });
    await addBlock({ type: "bloxide_show" });

    const spoken = await attachBlock({ to: "hide" });

    expect(spoken).toBe("Put it under the hide block");
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
  });

  it("says so when the blocks do not fit together", async () => {
    // Forever is a cap: once its body is taken, nothing can follow it.
    await addBlock({ type: "bloxide_forever" });
    await addBlock({ type: "bloxide_move" });
    await attachBlock({ to: "forever" });
    await addBlock({ type: "bloxide_say" });

    const spoken = await attachBlock({ to: "forever" });

    expect(spoken).toBe("A say block does not fit there.");
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
    await addBlock({ type: "bloxide_move" });

    const spoken = deleteBlock({});

    expect(workspace.getAllBlocks(false)).toHaveLength(0);
    expect(spoken).toBe("Deleted the move block");
  });

  it("deletes a named block", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });

    deleteBlock({ type: "repeat" });

    expect(ownBlocks().map((block) => block.type)).toEqual(["bloxide_say"]);
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
    await addBlock({ type: "bloxide_move" });

    const spoken = startProgram();

    expect(spoken).toBe("Running your program");
    // The handler returns immediately; the run is still in flight.
    expect(isProgramRunning()).toBe(true);
    await vi.waitFor(() => expect(isProgramRunning()).toBe(false));
    // The block's own default, carried out by the sprite.
    expect(Math.round(getSpriteState().x)).toBe(10);
  });

  it("says so when stopping with nothing running", () => {
    expect(haltProgram()).toBe("Nothing is running.");
  });

  it("builds and runs a whole program, one sentence at a time", async () => {
    // repeat 4 { move 50; say "hi" } — every step through the same handlers a
    // spoken sentence reaches, and nothing else.
    await addBlock({ type: "repeat" });
    await setParam({ value: "4" });
    await addBlock({ type: "move" });
    await attachBlock({ to: "repeat" });
    await setParam({ value: "50" });
    await addBlock({ type: "say" });
    await attachBlock({ to: "move" });
    await setParam({ value: "hi" });

    const said: (string | null)[] = [];
    const unsubscribe = spriteStore.subscribe(() => said.push(getSpriteState().saying));
    startProgram();
    await vi.waitFor(() => expect(isProgramRunning()).toBe(false));
    unsubscribe();

    expect(Math.round(getSpriteState().x)).toBe(200);
    expect(said).toContain("hi");
  });
});

describe("referring by number", () => {
  it("deletes the block wearing the number, not the last one touched", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });
    numberBlocks(workspace);

    const spoken = deleteBlock({ number: badgeOf("controls_repeat_ext") });

    expect(spoken).toBe("Deleted the repeat block");
    expect(ownBlocks().map((block) => block.type)).toEqual(["bloxide_say"]);
  });

  it("beats a type name when both are given", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });
    numberBlocks(workspace);

    // A misheard type with the right number still lands on the right block.
    const spoken = deleteBlock({ number: badgeOf("bloxide_say"), type: "repeat" });

    expect(spoken).toBe("Deleted the say block");
  });

  it("says so when no block wears that number", async () => {
    await addBlock({ type: "bloxide_say" });
    numberBlocks(workspace);

    expect(deleteBlock({ number: 9 })).toBe("There is no block 9.");
  });

  it("attaches by number, including two blocks of the same type", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "controls_repeat_ext" });
    numberBlocks(workspace);
    const [outer, inner] = workspace.getBlocksByType("controls_repeat_ext", true);
    if (!outer || !inner) throw new Error("expected two loops");

    const spoken = await attachBlock({
      number: getBlockNumber(inner) ?? 0,
      toNumber: getBlockNumber(outer) ?? 0,
    });

    expect(spoken).toContain("inside");
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
  });
});

describe("numbers stay usable without waiting for Blockly's events", () => {
  it("numbers a new block before the handler returns", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    // Blockly queues its create event; a spoken number must work right away.
    expect(ownBlocks().map(getBlockNumber)).toEqual([1]);
  });

  it("renumbers after an attach, so a badge is never stale", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });
    await attachBlock({ to: "repeat" });

    expect(ownBlocks().map(getBlockNumber)).toEqual([1, 2]);
  });

  it("closes the gap after a delete before returning", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });
    await addBlock({ type: "bloxide_forever" });

    deleteBlock({ number: 2 });

    expect(ownBlocks().map(getBlockNumber)).toEqual([1, 2]);
  });

  it("leaves a shadow unbadged, so every number names something worth saying", async () => {
    await addBlock({ type: "bloxide_go_to" });

    expect(workspace.getAllBlocks(true).map(getBlockNumber)).toEqual([1, null, null]);
  });

  it("finds a block by the badge it wears, not by its position", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });

    expect(deleteBlock({ number: badgeOf("bloxide_say") })).toBe("Deleted the say block");
  });
});

describe("setParam", () => {
  it("changes the block just touched when none is named", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    const spoken = await setParam({ value: "4" });

    expect(slotValue(firstOfType("controls_repeat_ext"), "TIMES")).toBe(4);
    expect(spoken).toContain("4");
  });

  it("changes the block wearing a number", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_move" });
    numberBlocks(workspace);

    await setParam({ number: badgeOf("controls_repeat_ext"), value: "7" });

    expect(slotValue(firstOfType("controls_repeat_ext"), "TIMES")).toBe(7);
  });

  it("changes the block named by type", async () => {
    await addBlock({ type: "controls_repeat_ext" });
    await addBlock({ type: "bloxide_say" });

    await setParam({ type: "say", value: "hello" });

    expect(slotValue(firstOfType("bloxide_say"), "TEXT")).toBe("hello");
  });

  it("says so when no block wears that number", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    expect(await setParam({ number: 9, value: "4" })).toBe("There is no block 9.");
  });

  it("writes into the slot it is given", async () => {
    await addBlock({ type: "bloxide_go_to" });

    const spoken = await setParam({ value: "30", slot: "y" });

    expect(slotValue(firstOfType("bloxide_go_to"), "Y")).toBe(30);
    expect(slotValue(firstOfType("bloxide_go_to"), "X")).toBe(0);
    expect(spoken).toContain("30");
  });

  it("asks which value rather than guessing, on a block that holds two", async () => {
    await addBlock({ type: "bloxide_go_to" });

    const spoken = await setParam({ value: "30" });

    expect(spoken).toBe("Say which one: x or y.");
    expect(slotValue(firstOfType("bloxide_go_to"), "X")).toBe(0);
  });

  it("offers the slot to the agent, so it can name one", () => {
    expect(VOICE_ACTIONS.setParam?.params?.slot?.type).toBe("string");
    expect(VOICE_ACTIONS.setParam?.params?.slot?.required).toBeFalsy();
  });

  it("leaves the block alone when the value does not fit it", async () => {
    await addBlock({ type: "controls_repeat_ext" });

    const spoken = await setParam({ value: "lots" });

    expect(spoken).toContain("not a number");
    expect(slotValue(firstOfType("controls_repeat_ext"), "TIMES")).toBe(10);
  });
});
