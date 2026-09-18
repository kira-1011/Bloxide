import type { VoxideActionConfig } from "@voxide/react";
import { getActiveWorkspace } from "@/blockly/activeWorkspace";

// Every capability the agent can invoke. One block, one connection or one value
// per utterance, and never `dangerous: true` — it asks for a click to confirm.

// Blockly is imported inside the handler, not at the top: the voice layer is
// eager, so a static import drags ~800 kB back into the entry chunk. By the
// time a handler runs, the editor chunk has already loaded it.
export async function addBlock({ type }: { type: string }): Promise<string> {
  const workspace = getActiveWorkspace();
  const { Blocks, BlockSvg } = await import("blockly/core");

  if (!Blocks[type]) {
    return `I do not know a block called ${type}.`;
  }

  const block = workspace.newBlock(type);
  // A headless workspace has no SVG to build; a rendered one needs both calls
  // or the block exists in the model and never appears on screen.
  if (block instanceof BlockSvg) {
    block.initSvg();
    block.render();
  }

  return `Added a ${type} block`;
}

export const VOICE_ACTIONS: Record<string, VoxideActionConfig> = {
  addBlock: {
    description: "Add a block to the workspace",
    params: { type: { type: "string", required: true } },
    handler: async (args) => addBlock(args as { type: string }),
  },
};
