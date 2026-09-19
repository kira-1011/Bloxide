import type { VoxideActionConfig } from "@voxide/react";
import { getActiveWorkspace } from "@/blockly/activeWorkspace";
import { forgetBlock, rememberBlock, resolveBlock } from "@/blockly/blockReference";
import { BLOCK_TYPES, resolveBlockType } from "@/blockly/toolbox";
import { isProgramRunning, runProgram, stopProgram } from "@/run/runner";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

// Blockly is imported inside the handlers, not at the top: the voice layer is
// eager, so a static import drags ~800 kB back into the entry chunk. By the
// time a handler runs, the editor chunk has already loaded it.

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
  }
  rememberBlock(block);

  return `Added a ${resolved} block`;
}

/**
 * Joins one block to another: inside it when it fits, below it otherwise.
 * Blockly refuses connections that make no sense, so a wrong pairing is a
 * spoken "that does not fit" rather than a broken program.
 */
export async function attachBlock({ type, to }: { type?: string; to: string }): Promise<string> {
  const workspace = getActiveWorkspace();

  const child = resolveBlock(workspace, type);
  if (!child)
    return type ? `I cannot find a ${type} block.` : "I am not sure which block you mean.";

  const parent = resolveBlock(workspace, to);
  if (!parent) return `I cannot find a ${to} block.`;
  if (child.id === parent.id) return "A block cannot be attached to itself.";

  const { ConnectionType } = await import("blockly/core");

  const openInputs = (kind: ConnectionTypeValue) =>
    parent.inputList
      .map((input) => input.connection)
      .filter((connection) => connection?.type === kind && !connection.targetConnection);

  type ConnectionTypeValue = (typeof ConnectionType)[keyof typeof ConnectionType];

  if (child.outputConnection) {
    for (const connection of openInputs(ConnectionType.INPUT_VALUE)) {
      if (connection?.connect(child.outputConnection)) return `Put it in the ${parent.type} block`;
    }
  }

  if (child.previousConnection) {
    // Inside first: "put a move block inside the repeat" is the common case.
    for (const connection of openInputs(ConnectionType.NEXT_STATEMENT)) {
      if (connection?.connect(child.previousConnection)) {
        return `Put it inside the ${parent.type} block`;
      }
    }
    if (parent.nextConnection && !parent.nextConnection.targetConnection) {
      if (parent.nextConnection.connect(child.previousConnection)) {
        return `Put it under the ${parent.type} block`;
      }
    }
  }

  return `A ${child.type} block does not fit there.`;
}

export function deleteBlock({ type }: { type?: string }): string {
  const workspace = getActiveWorkspace();

  const block = resolveBlock(workspace, type);
  if (!block)
    return type ? `I cannot find a ${type} block.` : "I am not sure which block you mean.";

  const removed = block.type;
  forgetBlock(block);
  // healStack: what was under it reconnects instead of being orphaned.
  block.dispose(true);

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

export const VOICE_ACTIONS: Record<string, VoxideActionConfig> = {
  addBlock: {
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
    handler: async (args) => addBlock(args as { type: string }),
  },

  attachBlock: {
    description:
      "Attach one block to another: inside it if it fits there, otherwise below it. " +
      "Omit 'type' to attach the block that was just added.",
    params: {
      type: {
        type: "string",
        enum: [...BLOCK_TYPES],
        description: "The block to attach. Omit for the block just added.",
      },
      to: {
        type: "string",
        required: true,
        enum: [...BLOCK_TYPES],
        description: "The block to attach it to",
      },
    },
    handler: async (args) => attachBlock(args as { type?: string; to: string }),
  },

  deleteBlock: {
    description: "Delete a block. Omit 'type' to delete the block that was just added.",
    params: {
      type: {
        type: "string",
        enum: [...BLOCK_TYPES],
        description: "The block to delete. Omit for the block just added.",
      },
    },
    handler: async (args) => deleteBlock(args as { type?: string }),
  },

  runProgram: {
    description: "Run the program",
    handler: async () => startProgram(),
  },

  stopProgram: {
    description: "Stop the running program",
    handler: async () => haltProgram(),
  },
};
