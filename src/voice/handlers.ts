import type * as Blockly from "blockly/core";
import { BlockSvg, ConnectionType, Events, serialization } from "blockly/core";
import type { VoxideActionConfig } from "@voxide/react";
import { defineAction } from "@/voice/define-action";
import { getActiveWorkspace } from "@/blockly/active-workspace";
import { setFieldValue } from "@/blockly/block-fields";
import { getBlockNumber, numberBlocks, revealBlock, selectOnly } from "@/blockly/block-view";
import {
  findBlockByNumber,
  forgetBlock,
  forgetMissingBlock,
  rememberBlock,
  resolveBlock,
} from "@/blockly/block-reference";
import { BLOCK_NAMES, resolveBlockType, slotDefaults, spokenName } from "@/blockly/toolbox";
import { isProgramRunning, runProgram, stopProgram } from "@/run/runner";
import { isZoomDirection, zoomWorkspace, ZOOM_DIRECTIONS } from "@/blockly/workspace-zoom";
import { growStage } from "@/sprite/stage-size";
import { isPaletteOpen, setPaletteOpen } from "@/palette/palette-store";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

type ConnectionTypeValue = (typeof ConnectionType)[keyof typeof ConnectionType];

/**
 * The SDK snapshots the workspace *before* an action runs, so the result is the
 * only channel that can tell the agent about a number that just changed.
 */
function andItsNumber(said: string, block: Blockly.Block): string {
  const number = getBlockNumber(block);
  return number === null ? said : `${said}. It is block ${number}.`;
}

/**
 * One sentence, one undo step. Blockly undoes a whole event group at a time,
 * and a single edit fires several events — healing a stack under a deleted
 * block moves what was below it — so without a group the child would have to
 * say "undo" twice to take one sentence back.
 */
function asOneEdit<T>(change: () => T): T {
  Events.setGroup(true);
  try {
    return change();
  } finally {
    Events.setGroup(false);
  }
}

function describeMiss(type?: string, number?: number): string {
  if (number !== undefined) return `There is no block ${number}.`;
  if (type) return `I cannot find a ${type} block.`;
  return "I am not sure which block you mean.";
}

export function addBlock({ type }: { type: string }): string {
  const workspace = getActiveWorkspace();

  // Against our toolbox, not Blockly's registry: the enum only steers the
  // model, and the registry would accept hundreds of blocks we do not ship.
  const resolved = resolveBlockType(type);
  if (!resolved) {
    return `I do not know a block called ${type}.`;
  }

  // Through the serialiser rather than newBlock: newBlock makes no shadows, so
  // a block with value inputs would arrive with holes in it, and filling a hole
  // takes a block dropped in by hand.
  const inputs = slotDefaults(resolved);
  const block = asOneEdit(() => {
    // recordUndo defaults to false on the serialiser — it is written for
    // loading a saved program — so without it a block added by voice could
    // never be taken back.
    const added = serialization.blocks.append(
      { type: resolved, ...(inputs ? { inputs } : {}) },
      workspace,
      { recordUndo: true },
    );

    if (added instanceof BlockSvg) {
      // Every new block starts at the origin, so without this they pile up on
      // each other and a number cannot be read off the screen.
      workspace.cleanUp();
      // Blockly's own selection is the highlight AGENTS.md asks for, and it
      // shows which block the next utterance will act on.
      selectOnly(added);
      revealBlock(workspace, added);
    }
    return added;
  });
  rememberBlock(block);
  // Blockly queues its create event, so the workspace listener would not
  // renumber until after this returns and the next spoken number would miss.
  numberBlocks(workspace);

  return andItsNumber(`Added a ${spokenName(resolved)} block`, block);
}

/**
 * Joins one block to another: inside it when it fits, below it otherwise.
 * Blockly refuses connections that make no sense, so a wrong pairing is a
 * spoken "that does not fit" rather than a broken program.
 */
export function attachBlock({
  type,
  number,
  to,
  toNumber,
}: {
  type?: string;
  number?: number;
  to?: string;
  toNumber?: number;
}): string {
  const workspace = getActiveWorkspace();

  const child = resolveBlock(workspace, type, number !== undefined ? { number } : {});
  if (!child) return describeMiss(type, number);

  // Excluded, or "put the repeat inside the other repeat" resolves to the very
  // block being moved and nesting two of a kind becomes impossible.
  const parent = resolveBlock(workspace, to, {
    exclude: child.id,
    ...(toNumber !== undefined ? { number: toNumber } : {}),
  });
  if (!parent) {
    const withoutExclusion = resolveBlock(
      workspace,
      to,
      toNumber !== undefined ? { number: toNumber } : {},
    );
    return withoutExclusion?.id === child.id
      ? "A block cannot be attached to itself."
      : describeMiss(to, toNumber);
  }

  // A shadow counts as open: it is a default, and Blockly puts it back if the
  // block covering it is taken away again. Without this, giving blocks their
  // slot defaults would be what stops a real block from ever going in one.
  const openInputs = (kind: ConnectionTypeValue) =>
    parent.inputList
      .map((input) => input.connection)
      .filter(
        (connection) =>
          connection?.type === kind &&
          (!connection.targetConnection || connection.targetBlock()?.isShadow() === true),
      );

  // Unreachable until a sensing block lands: nothing a child can ask for
  // reports a value yet, which is why DESIGN.md's known gaps leave `repeat
  // until` with an empty hexagon.
  if (child.outputConnection) {
    for (const connection of openInputs(ConnectionType.INPUT_VALUE)) {
      if (connection?.connect(child.outputConnection)) {
        numberBlocks(workspace);
        return andItsNumber(`Put it in the ${spokenName(parent.type)} block`, child);
      }
    }
  }

  if (child.previousConnection) {
    // Inside first: "put a move block inside the repeat" is the common case.
    for (const connection of openInputs(ConnectionType.NEXT_STATEMENT)) {
      if (connection?.connect(child.previousConnection)) {
        numberBlocks(workspace);
        return andItsNumber(`Put it inside the ${spokenName(parent.type)} block`, child);
      }
    }
    if (parent.nextConnection && !parent.nextConnection.targetConnection) {
      if (parent.nextConnection.connect(child.previousConnection)) {
        numberBlocks(workspace);
        return andItsNumber(`Put it under the ${spokenName(parent.type)} block`, child);
      }
    }
  }

  return `A ${spokenName(child.type)} block does not fit there.`;
}

/**
 * `go to x () y ()` holds two values, so `slot` names which. With one it is
 * left out; with two an unnamed slot is asked about rather than guessed.
 */
export function setParam({
  type,
  number,
  value,
  slot,
}: {
  type?: string;
  number?: number;
  value: string;
  slot?: string;
}): string {
  const workspace = getActiveWorkspace();

  const block = resolveBlock(workspace, type, number !== undefined ? { number } : {});
  if (!block) return describeMiss(type, number);

  const change = setFieldValue(block, value, slot);
  if (!change.ok) return change.spoken;

  if (block instanceof BlockSvg) {
    selectOnly(block);
    revealBlock(workspace, block);
  }
  rememberBlock(block);

  return andItsNumber(change.spoken, block);
}

/**
 * Numbers only: what "all of them" means is the agent's to work out.
 *
 * `Number` is generous — "1e2" is 100, "0x10" is 16 — so the round trip is what
 * rejects those, and a wrong deletion cannot be undone by speaking.
 */
function blockNumber(part: string): number | null {
  const parsed = Number(part);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return String(parsed) === part ? parsed : null;
}

function parseNumbers(numbers: string): number[] | null {
  const parsed = numbers.split(",").map((part) => blockNumber(part.trim()));
  return parsed.every((number) => number !== null) ? parsed : null;
}

/** Counted after the fact: what the workspace holds, not what we meant to remove. */
function ownBlocks(workspace: Blockly.Workspace): Blockly.Block[] {
  return workspace.getAllBlocks(false).filter((block) => !block.isShadow());
}

function countOf(n: number): string {
  return n === 1 ? "1 block" : `${n} blocks`;
}

/** What is left, said the same way however many went. */
function andWhatIsLeft(spoken: string, workspace: Blockly.Workspace): string {
  const left = ownBlocks(workspace).length;
  return left === 0
    ? `${spoken}. The workspace is empty.`
    : `${spoken}. ${countOf(left)} left, numbered from one.`;
}

/**
 * Deletes a block, several by the numbers on them, or every one.
 *
 * Starting over has to be sayable. Emptying the workspace by hand means
 * dragging each block to the bin one at a time, which is the thing our users
 * cannot do — without this, the only way out of a tangled program is a mouse.
 */
export function deleteBlocks({
  type,
  number,
  numbers,
}: {
  type?: string;
  number?: number;
  numbers?: string;
}): string {
  const workspace = getActiveWorkspace();

  if (numbers !== undefined) return deleteMany(workspace, numbers);

  const block = resolveBlock(workspace, type, number !== undefined ? { number } : {});
  if (!block) return describeMiss(type, number);

  const removed = spokenName(block.type);
  forgetBlock(block);
  // healStack: what was under it reconnects instead of being orphaned.
  asOneEdit(() => block.dispose(true));
  forgetMissingBlock(workspace);
  numberBlocks(workspace);

  // The block it named is gone, so there is no number to give back — but every
  // number after it has just moved up, and the agent's copy of the workspace
  // predates that.
  return andWhatIsLeft(`Deleted the ${removed} block`, workspace);
}

function deleteMany(workspace: Blockly.Workspace, numbers: string): string {
  if (ownBlocks(workspace).length === 0) return "There is nothing to delete.";

  const wanted = parseNumbers(numbers);
  if (!wanted) return "I am not sure which blocks you mean.";

  // Every block is found before any is removed: deleting one renumbers the
  // rest, so resolving as we went would make the second number mean something
  // else by the time we reached it.
  const found = wanted
    .map((n) => findBlockByNumber(workspace, n))
    .filter((block): block is Blockly.Block => block !== null);

  const unique = [...new Set(found)];
  if (unique.length === 0) return "I cannot find those blocks.";

  asOneEdit(() => {
    for (const block of unique) {
      forgetBlock(block);
      // A block inside one already deleted goes with it; disposing twice throws.
      if (!block.disposed) block.dispose(true);
    }
  });
  forgetMissingBlock(workspace);
  numberBlocks(workspace);

  return andWhatIsLeft(`Deleted ${countOf(unique.length)}`, workspace);
}

/**
 * Steps Blockly's own history. It records every change as an event already, so
 * a history of ours would be a second answer to the same question and would
 * drift from the workspace the moment either side gained a feature.
 *
 * The count is the point of the sentence: undo puts blocks back and takes them
 * away, and the agent's snapshot of the workspace predates that.
 */
function stepHistory(redo: boolean): string {
  const workspace = getActiveWorkspace();

  const history = redo ? workspace.getRedoStack() : workspace.getUndoStack();
  if (history.length === 0) {
    return redo ? "There is nothing to redo." : "There is nothing to undo.";
  }

  workspace.undo(redo);
  // The block "it" referred to can have just been undone out of existence.
  forgetMissingBlock(workspace);
  numberBlocks(workspace);

  return andWhatIsLeft(redo ? "Redone" : "Undone", workspace);
}

/**
 * Takes back the last change. The one capability that has to exist beside
 * `deleteBlocks`: a misheard sentence can empty the workspace, and a child who
 * cannot drag has no other way to get a program back.
 */
export function undoEdit(): string {
  return stepHistory(false);
}

/** Undo's own undo, so saying it by mistake costs nothing either. */
export function redoEdit(): string {
  return stepHistory(true);
}

/**
 * Starts the program and returns at once. Awaiting it would hold the
 * conversation open for as long as the program runs.
 */
export function startProgram(): string {
  const workspace = getActiveWorkspace();

  if (workspace.getAllBlocks(false).length === 0) {
    return "There are no blocks to run yet.";
  }

  void runProgram(workspace);
  return "Running your program";
}

export function haltProgram(): string {
  if (!isProgramRunning()) return "Nothing is running.";

  stopProgram();
  return "Stopped";
}

export function zoom({ direction }: { direction: string }): string {
  if (!isZoomDirection(direction)) return "I can zoom in, zoom out, or go back to normal.";
  zoomWorkspace(getActiveWorkspace(), direction);
  return direction === "reset" ? "Back to normal size." : `Zoomed ${direction}.`;
}

export function resizeStage({ size }: { size: string }): string {
  if (size !== "bigger" && size !== "smaller") return "I can make the stage bigger or smaller.";
  if (!growStage(size === "bigger" ? 1 : -1)) {
    return `The stage is already as ${size === "bigger" ? "big" : "small"} as it goes.`;
  }
  return `Made the stage ${size}.`;
}

export function showBlocks({ visible }: { visible: string }): string {
  if (visible !== "show" && visible !== "hide") return "I can show the blocks or hide them.";
  const open = visible === "show";
  if (isPaletteOpen() === open)
    return open ? "The blocks are already showing." : "The blocks are already hidden.";
  setPaletteOpen(open);
  // Hidden blocks can still be asked for by name, and the child should know it.
  return open ? "Showing the blocks." : "Hid the blocks. You can still ask for any block by name.";
}

export const VOICE_ACTIONS = {
  addBlock: defineAction({
    description: "Add a block to the workspace",
    params: {
      type: {
        type: "string",
        required: true,
        enum: [...BLOCK_NAMES],
        description: "The block to add, by name",
      },
    },
    handler: ({ type }) => addBlock({ type }),
  }),

  attachBlock: defineAction({
    description:
      "Attach one block to another: inside it if it fits there, otherwise below it. " +
      "Blocks show a number on screen; prefer those. Omit the block to attach " +
      "to use the one just added.",
    params: {
      number: {
        type: "number",
        description: "The number shown on the block to attach. Most precise.",
      },
      type: {
        type: "string",
        enum: [...BLOCK_NAMES],
        description: "The block to attach, by name. Omit for the block just added.",
      },
      toNumber: {
        type: "number",
        description: "The number shown on the block to attach it to. Most precise.",
      },
      to: {
        type: "string",
        enum: [...BLOCK_NAMES],
        description: "The block to attach it to, by name",
      },
    },
    handler: (args) => attachBlock(args),
  }),

  deleteBlocks: defineAction({
    description:
      "Delete blocks: one by its number or name, or several by their numbers. " +
      "Omit everything to delete the block that was just added.",
    params: {
      number: {
        type: "number",
        description: "The number shown on a single block to delete. Most precise.",
      },
      numbers: {
        type: "string",
        description:
          "Several blocks at once: the numbers shown on them, separated by commas, like '2, 4'. " +
          "To clear the workspace, list every block's number.",
      },
      type: {
        type: "string",
        enum: [...BLOCK_NAMES],
        description: "The block to delete, by name",
      },
    },
    handler: (args) => deleteBlocks(args),
  }),

  setParam: defineAction({
    description:
      "Change the value on a block: how many times a loop repeats, what a piece " +
      "of text says, or which comparison is made. Blocks show a number on " +
      "screen; prefer those. Omit the block to change the one just touched.",
    params: {
      number: {
        type: "number",
        description: "The number shown on the block to change. Most precise.",
      },
      type: {
        type: "string",
        enum: [...BLOCK_NAMES],
        description: "The block to change, by name",
      },
      value: {
        type: "string",
        required: true,
        description: "The new value: digits for a number, or the words for a comparison",
      },
      slot: {
        type: "string",
        description:
          "Which value to change on a block that holds more than one, such as " +
          "x or y. Omit when the block holds only one.",
      },
    },
    handler: (args) => setParam(args),
  }),

  undo: defineAction({
    description:
      "Undo the last change to the blocks, putting back whatever it deleted or changed. " +
      "Use this whenever something was removed or changed by mistake.",
    handler: () => undoEdit(),
  }),

  redo: defineAction({
    description: "Put back the change that undo just took away",
    handler: () => redoEdit(),
  }),

  runProgram: defineAction({
    description: "Run the program",
    handler: () => startProgram(),
  }),

  stopProgram: defineAction({
    description: "Stop the running program",
    handler: () => haltProgram(),
  }),
  zoom: defineAction({
    description: "Zoom the block workspace in or out, or back to normal size",
    params: {
      direction: {
        type: "string",
        required: true,
        enum: [...ZOOM_DIRECTIONS],
        description: "in, out, or reset for normal size",
      },
    },
    handler: ({ direction }) => zoom({ direction }),
  }),
  showBlocks: defineAction({
    description:
      "Show or hide the list of blocks on the left, to make more room. Blocks can still be added by name while it is hidden.",
    params: {
      visible: {
        type: "string",
        required: true,
        enum: ["show", "hide"],
        description: "show to open the block list, hide to fold it away",
      },
    },
    handler: ({ visible }) => showBlocks({ visible }),
  }),
  resizeStage: defineAction({
    description: "Make the sprite stage bigger or smaller",
    params: {
      size: {
        type: "string",
        required: true,
        enum: ["bigger", "smaller"],
        description: "Which way to resize the stage",
      },
    },
    handler: ({ size }) => resizeStage({ size }),
  }),
} satisfies Record<string, VoxideActionConfig>;
