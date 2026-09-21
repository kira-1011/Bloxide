import type * as Blockly from "blockly/core";
import { BlockSvg, ConnectionType, serialization } from "blockly/core";
import type { VoxideActionConfig } from "@voxide/react";
import { defineAction } from "@/voice/define-action";
import { getActiveWorkspace } from "@/blockly/active-workspace";
import { setFieldValue } from "@/blockly/block-fields";
import { getBlockNumber, numberBlocks, revealBlock, selectOnly } from "@/blockly/block-view";
import {
  findBlockByNumber,
  forgetBlock,
  forgetEveryBlock,
  rememberBlock,
  resolveBlock,
} from "@/blockly/block-reference";
import { BLOCK_NAMES, resolveBlockType, slotDefaults, spokenName } from "@/blockly/toolbox";
import { isProgramRunning, runProgram, stopProgram } from "@/run/runner";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

type ConnectionTypeValue = (typeof ConnectionType)[keyof typeof ConnectionType];

/**
 * Says which block it was, because the agent cannot see that yet.
 *
 * Every tool result carries the workspace back to the agent, but the SDK takes
 * that snapshot *before* the action runs — so a block added in this breath is
 * missing from it, and the blocks that were renumbered around it still read as
 * they were. The result is the only channel that reflects the change, so the
 * number rides home on it. DESIGN.md asks for exactly this sentence.
 */
function andItsNumber(said: string, block: Blockly.Block): string {
  const number = getBlockNumber(block);
  return number === null ? said : `${said}. It is block ${number}.`;
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
  const block = serialization.blocks.append(
    { type: resolved, ...(inputs ? { inputs } : {}) },
    workspace,
  );

  if (block instanceof BlockSvg) {
    // Every new block starts at the origin, so without this they pile up on
    // each other and a number cannot be read off the screen.
    workspace.cleanUp();
    // Blockly's own selection is the highlight AGENTS.md asks for, and it
    // shows which block the next utterance will act on.
    selectOnly(block);
    revealBlock(workspace, block);
  }
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
 * Changes a value written on a block: how many times a loop repeats, what a
 * piece of text says, which comparison is made.
 *
 * A block can hold more than one — `go to x () y ()` holds two — so `slot`
 * names which. Left out where there is only one, and where there is more than
 * one it is asked for rather than guessed.
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
 * Which blocks a sentence meant: one, a handful, or the lot.
 *
 * The agent sends a string because the param schema carries only strings and
 * numbers — no arrays, no booleans — so it is parsed into a real shape here
 * rather than being read as a string everywhere downstream.
 */
type Wanted = { readonly kind: "all" } | { readonly kind: "list"; readonly numbers: number[] };

function parseWanted(numbers: string): Wanted | null {
  if (/\b(all|every|everything)\b/i.test(numbers)) return { kind: "all" };

  const found = numbers.match(/\d+/g)?.map(Number) ?? [];
  return found.length > 0 ? { kind: "list", numbers: found } : null;
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

  if (numbers !== undefined) return deleteMany(workspace, numbers, type);

  const block = resolveBlock(workspace, type, number !== undefined ? { number } : {});
  if (!block) return describeMiss(type, number);

  const removed = spokenName(block.type);
  forgetBlock(block);
  // healStack: what was under it reconnects instead of being orphaned.
  block.dispose(true);
  numberBlocks(workspace);

  // The block it named is gone, so there is no number to give back — but every
  // number after it has just moved up, and the agent's copy of the workspace
  // predates that.
  return andWhatIsLeft(`Deleted the ${removed} block`, workspace);
}

function deleteMany(workspace: Blockly.Workspace, numbers: string, type?: string): string {
  const present = ownBlocks(workspace);
  if (present.length === 0) return "There is nothing to delete.";

  const wanted = parseWanted(numbers);
  if (!wanted) return "I am not sure which blocks you mean.";

  const resolved = type === undefined ? null : resolveBlockType(type);
  if (type !== undefined && !resolved) return `I do not know a block called ${type}.`;

  if (wanted.kind === "all" && !resolved) {
    // Blockly's own clear rather than disposing one by one: it takes the undo
    // stack and everything else hanging off the workspace with it.
    workspace.clear();
    forgetEveryBlock();
    numberBlocks(workspace);
    return `Deleted ${countOf(present.length)}. The workspace is empty.`;
  }

  // Every block is found before any is removed: deleting one renumbers the
  // rest, so resolving as we went would make the second number mean something
  // else by the time we reached it.
  const doomed =
    wanted.kind === "all"
      ? present.filter((block) => block.type === resolved)
      : wanted.numbers
          .map((n) => findBlockByNumber(workspace, n))
          .filter((block): block is Blockly.Block => block !== null)
          .filter((block) => resolved === null || block.type === resolved);

  const unique = [...new Set(doomed)];
  if (unique.length === 0) {
    return resolved
      ? `I cannot find a ${spokenName(resolved)} block.`
      : "I cannot find those blocks.";
  }

  for (const block of unique) {
    forgetBlock(block);
    // A block inside one already deleted goes with it; disposing twice throws.
    if (!block.disposed) block.dispose(true);
  }
  numberBlocks(workspace);

  const what = resolved ? `, all of them ${spokenName(resolved)}` : "";
  return andWhatIsLeft(`Deleted ${countOf(unique.length)}${what}`, workspace);
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
      "Delete blocks: one, several, or every one. " +
      "Omit everything to delete the block that was just added.",
    params: {
      number: {
        type: "number",
        description: "The number shown on a single block to delete. Most precise.",
      },
      numbers: {
        type: "string",
        description:
          "Several blocks at once: the numbers shown on them, like '2, 4', " +
          "or the word 'all' for every block. 'all' with a type deletes every block of that kind.",
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

  runProgram: defineAction({
    description: "Run the program",
    handler: () => startProgram(),
  }),

  stopProgram: defineAction({
    description: "Stop the running program",
    handler: () => haltProgram(),
  }),
} satisfies Record<string, VoxideActionConfig>;
