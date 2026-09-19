import * as Blockly from "blockly/core";
import { getActiveWorkspace, hasActiveWorkspace } from "@/blockly/activeWorkspace";
import { isProgramRunning } from "@/run/runner";

export interface ProgramSnapshot {
  readonly running: boolean;
  readonly blockCount: number;
  /** Blockly's own serialisation, one entry per top-level stack. */
  readonly stacks: readonly Blockly.serialization.blocks.State[];
}

const EMPTY: ProgramSnapshot = { running: false, blockCount: 0, stacks: [] };

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

  return {
    running: isProgramRunning(),
    blockCount: workspace.getAllBlocks(false).length,
    stacks: workspace
      .getTopBlocks(true)
      .map((block) =>
        Blockly.serialization.blocks.save(block, { addCoordinates: false, saveIds: false }),
      )
      .filter((state): state is Blockly.serialization.blocks.State => state !== null),
  };
}
