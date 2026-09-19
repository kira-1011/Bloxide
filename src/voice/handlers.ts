import type { VoxideActionConfig } from "@voxide/react";
import { defineAction } from "@/voice/define-action";
import { getActiveWorkspace } from "@/blockly/active-workspace";
import { numberBlocks } from "@/blockly/block-view";
import { revealBlock } from "@/blockly/block-view";
import { forgetBlock, rememberBlock, resolveBlock } from "@/blockly/block-reference";
import { BLOCK_TYPES, resolveBlockType } from "@/blockly/toolbox";
import { isProgramRunning, runProgram, stopProgram } from "@/run/runner";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

// Blockly is imported inside the handlers, not at the top: the voice layer is
// eager, so a static import drags ~800 kB back into the entry chunk. By the
// time a handler runs, the editor chunk has already loaded it.

function describeMiss(type?: string, number?: number): string {
  if (number !== undefined) return `There is no block ${number}.`;
  if (type) return `I cannot find a ${type} block.`;
  return "I am not sure which block you mean.";
}

export async function addBlock({ type }: { type: string }): Promise<string> {
  const workspace = getActiveWorkspace();

  // Against our toolbox, not Blockly's registry: the enum only steers the
  // model, and the registry would accept hundreds of blocks we do not ship.
  const resolved = resolveBlockType(type);
  if (!resolved) {
    return `I do not know a block called ${type}.`;
  }

  const { BlockSvg } = await import("blockly/core");
  const block = workspace.newBlock(resolved);
  // A headless workspace has no SVG to build; a rendered one needs both calls
  // or the block exists in the model and never appears on screen.
  if (block instanceof BlockSvg) {
    block.initSvg();
    block.render();
    // Every new block starts at the origin, so without this they pile up on
    // each other and a number cannot be read off the screen.
    workspace.cleanUp();
    // Blockly's own selection is the highlight AGENTS.md asks for, and it
    // shows which block the next utterance will act on.
    block.select();
    revealBlock(workspace, block);
  }
  rememberBlock(block);
  // Blockly queues its create event, so the workspace listener would not
  // renumber until after this returns and the next spoken number would miss.
  numberBlocks(workspace);

  return `Added a ${resolved} block`;
}

/**
 * Joins one block to another: inside it when it fits, below it otherwise.
 * Blockly refuses connections that make no sense, so a wrong pairing is a
 * spoken "that does not fit" rather than a broken program.
 */
export async function attachBlock({
  type,
  number,
  to,
  toNumber,
}: {
  type?: string;
  number?: number;
  to?: string;
  toNumber?: number;
}): Promise<string> {
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

  const { ConnectionType } = await import("blockly/core");

  const openInputs = (kind: ConnectionTypeValue) =>
    parent.inputList
      .map((input) => input.connection)
      .filter((connection) => connection?.type === kind && !connection.targetConnection);

  type ConnectionTypeValue = (typeof ConnectionType)[keyof typeof ConnectionType];

  if (child.outputConnection) {
    for (const connection of openInputs(ConnectionType.INPUT_VALUE)) {
      if (connection?.connect(child.outputConnection)) {
        numberBlocks(workspace);
        return `Put it in the ${parent.type} block`;
      }
    }
  }

  if (child.previousConnection) {
    // Inside first: "put a move block inside the repeat" is the common case.
    for (const connection of openInputs(ConnectionType.NEXT_STATEMENT)) {
      if (connection?.connect(child.previousConnection)) {
        numberBlocks(workspace);
        return `Put it inside the ${parent.type} block`;
      }
    }
    if (parent.nextConnection && !parent.nextConnection.targetConnection) {
      if (parent.nextConnection.connect(child.previousConnection)) {
        numberBlocks(workspace);
        return `Put it under the ${parent.type} block`;
      }
    }
  }

  return `A ${child.type} block does not fit there.`;
}

export function deleteBlock({ type, number }: { type?: string; number?: number }): string {
  const workspace = getActiveWorkspace();

  const block = resolveBlock(workspace, type, number !== undefined ? { number } : {});
  if (!block) return describeMiss(type, number);

  const removed = block.type;
  forgetBlock(block);
  // healStack: what was under it reconnects instead of being orphaned.
  block.dispose(true);
  numberBlocks(workspace);

  return `Deleted the ${removed} block`;
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
        // Without the enum the model passes the spoken word through —
        // "repeat" rather than controls_repeat_ext — and nothing matches.
        enum: [...BLOCK_TYPES],
        description: "The Blockly type id of the block to add",
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
        enum: [...BLOCK_TYPES],
        description: "The block to attach, by type. Omit for the block just added.",
      },
      toNumber: {
        type: "number",
        description: "The number shown on the block to attach it to. Most precise.",
      },
      to: {
        type: "string",
        enum: [...BLOCK_TYPES],
        description: "The block to attach it to, by type",
      },
    },
    handler: (args) => attachBlock(args),
  }),

  deleteBlock: defineAction({
    description:
      "Delete a block, by the number shown on it or by type. " +
      "Omit both to delete the block that was just added.",
    params: {
      number: {
        type: "number",
        description: "The number shown on the block to delete. Most precise.",
      },
      type: {
        type: "string",
        enum: [...BLOCK_TYPES],
        description: "The block to delete, by type",
      },
    },
    handler: (args) => deleteBlock(args),
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
