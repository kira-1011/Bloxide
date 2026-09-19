import type * as Blockly from "blockly/core";
import { BlockNumberIcon } from "@/blockly/BlockNumberIcon";

/**
 * A bare value block — a number or a piece of text — is drawn by zelos as one
 * full-block field, so a badge inside it sits under the field editor and reads
 * as part of the value. Those are referred to by what they are instead.
 */
function canWearBadge(block: Blockly.Block): boolean {
  // Fields hang off dummy inputs, so count connections rather than inputs: a
  // literal is a block that reports a value and takes none.
  const takesBlocks = block.inputList.some((input) => input.connection);
  return !(block.outputConnection && !takesBlocks);
}

/**
 * Numbers the blocks so one can be named out loud — the floor AGENTS.md asks
 * for, when the implicit target is wrong and a type name is ambiguous.
 *
 * Workspace order, which is the order the agent is told about, so the badge and
 * the agent can never disagree.
 */
export function numberBlocks(workspace: Blockly.Workspace): void {
  workspace
    .getAllBlocks(true)
    .filter(canWearBadge)
    .forEach((block, index) => {
      const number = index + 1;
      const existing = block.getIcon(BlockNumberIcon.TYPE);

      if (existing) {
        existing.setNumber(number);
        return;
      }

      const icon = new BlockNumberIcon(block);
      icon.setNumber(number);
      block.addIcon(icon);
    });
}

/**
 * Resolves "block three" to the block wearing that badge.
 *
 * By the badge, not by position: Blockly queues its events, so between a change
 * and the next renumber the order can differ from what is on screen. What the
 * speaker can see has to win.
 */
export function findBlockByNumber(
  workspace: Blockly.Workspace,
  number: number,
): Blockly.Block | null {
  return workspace.getAllBlocks(true).find((block) => getBlockNumber(block) === number) ?? null;
}

/** The number a block is wearing, for speaking it back. */
export function getBlockNumber(block: Blockly.Block): number | null {
  return block.getIcon(BlockNumberIcon.TYPE)?.getNumber() ?? null;
}
