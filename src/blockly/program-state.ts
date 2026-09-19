import * as Blockly from "blockly/core";
import { getActiveWorkspace, hasActiveWorkspace } from "@/blockly/active-workspace";
import { getBlockNumber } from "@/blockly/block-view";
import { isProgramRunning } from "@/run/runner";
import type { SpriteState } from "@/sprite/sprite-state";
import { getSpriteState } from "@/sprite/sprite-store";

/** Where the sprite is, in numbers the agent can say out loud. */
export interface SpriteSnapshot {
  readonly x: number;
  readonly y: number;
  readonly direction: number;
  readonly size: number;
  readonly visible: boolean;
  readonly saying: string | null;
}

export interface ProgramSnapshot {
  readonly running: boolean;
  readonly blockCount: number;
  /** Blockly's own serialisation, one entry per top-level stack. */
  readonly stacks: readonly Blockly.serialization.blocks.State[];
  /** What each badge on screen says, so a spoken number resolves. */
  readonly numbered: readonly { readonly number: number; readonly type: string }[];
  readonly sprite: SpriteSnapshot;
}

/**
 * Rounded here rather than in the store: the store keeps sub-pixel precision
 * or a run of small turns and moves drifts, but "x is 40.0000001" is not a
 * sentence to say to a child.
 */
function describeSprite(sprite: SpriteState): SpriteSnapshot {
  return {
    x: Math.round(sprite.x),
    y: Math.round(sprite.y),
    direction: Math.round(sprite.direction),
    size: Math.round(sprite.size),
    visible: sprite.visible,
    saying: sprite.saying,
  };
}

/**
 * What the agent is told about the workspace before each utterance.
 *
 * Blockly's serialiser is the source: it already knows how blocks nest and what
 * their fields hold, and a second description of the same thing would drift.
 * Ids and coordinates are left out — they are re-read every turn and mean
 * nothing to the agent.
 */
export function describeProgram(): ProgramSnapshot {
  // Read live in both branches: the sprite outlives the workspace, so a
  // constant here would report a default sprite that has actually moved.
  const sprite = describeSprite(getSpriteState());

  if (!hasActiveWorkspace()) {
    return { running: false, blockCount: 0, stacks: [], numbered: [], sprite };
  }

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
    sprite,
  };
}
