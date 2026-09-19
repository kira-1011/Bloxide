import * as Blockly from "blockly/core";
import { getActiveWorkspace, hasActiveWorkspace } from "@/blockly/activeWorkspace";
import { getBlockNumber } from "@/blockly/blockView";
import { isProgramRunning } from "@/run/runner";

export interface ProgramSnapshot {
  readonly running: boolean;
  readonly blockCount: number;
  /** Blockly's own serialisation, one entry per top-level stack. */
  readonly stacks: readonly Blockly.serialization.blocks.State[];
  /** What each badge on screen says, so a spoken number resolves. */
  readonly numbered: readonly { readonly number: number; readonly type: string }[];
}

const EMPTY: ProgramSnapshot = { running: false, blockCount: 0, stacks: [], numbered: [] };

/**
 * What the agent is told about the workspace before each utterance.
 *
 * Blockly's serialiser is the source: it already knows how blocks nest and what
 * their fields hold, and a second description of the same thing would drift.
 * Ids and coordinates are left out — they are re-read every turn and mean
 * nothing to the agent.
 */
export function describeProgram(): ProgramSnapshot {
  if (!hasActiveWorkspace()) return EMPTY;

  const workspace = getActiveWorkspace();

  const all = workspace.getAllBlocks(true);

  return {
    running: isProgramRunning(),
    blockCount: all.length,
    // Only what is actually badged on screen: a number the speaker cannot see
    // is a number they cannot say.
    numbered: all.flatMap((block) => {
      const number = getBlockNumber(block);
      return number === null ? [] : [{ number, type: block.type }];
    }),
    stacks: workspace
      .getTopBlocks(true)
      .map((block) =>
        Blockly.serialization.blocks.save(block, { addCoordinates: false, saveIds: false }),
      )
      .filter((state): state is Blockly.serialization.blocks.State => state !== null),
  };
}
