import type { VoxideActionConfig } from "@voxide/react";
import { getActiveWorkspace } from "@/blockly/activeWorkspace";
import { BLOCK_TYPES, resolveBlockType } from "@/blockly/toolbox";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

// Blockly is imported inside the handler, not at the top: the voice layer is
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

  return `Added a ${resolved} block`;
}

export const VOICE_ACTIONS: Record<string, VoxideActionConfig> = {
  addBlock: {
    description: "Add a block to the workspace",
    params: {
      type: {
        type: "string",
        required: true,
        // Without the enum the model passes the child's word through —
        // "repeat" rather than controls_repeat_ext — and nothing matches.
        enum: [...BLOCK_TYPES],
        description: "The Blockly type id of the block to add",
      },
    },
    handler: async (args) => addBlock(args as { type: string }),
  },
};
