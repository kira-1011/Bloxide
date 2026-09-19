import type * as Blockly from "blockly/core";
import { BlockNumberIcon } from "@/blockly/block-number-icon";

// What someone sees of a block: the number it wears, and whether it is on
// screen at all.

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
  const all = workspace.getAllBlocks(true);

  // A mutation can take away the last value input, and a badge left behind
  // would name a block the numbering no longer counts.
  for (const block of all) {
    if (!canWearBadge(block)) block.removeIcon(BlockNumberIcon.TYPE);
  }

  all.filter(canWearBadge).forEach((block, index) => {
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

/** The number a block is wearing, for speaking it back. */
export function getBlockNumber(block: Blockly.Block): number | null {
  return block.getIcon(BlockNumberIcon.TYPE)?.getNumber() ?? null;
}

/**
 * Brings a block into view when it is not already there.
 *
 * Blockly clamps scrolling to the content, so with a short program a new block
 * is always on screen. Once a program is taller than the viewport it is not:
 * blocks are laid out from the top, and someone working at the bottom would
 * hear that a block was added and see nothing change.
 *
 * Only when it is needed — recentring on every action would move the workspace
 * under someone who is reading it.
 */
export function revealBlock(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg): void {
  const view = workspace.getMetricsManager().getViewMetrics(true);
  const bounds = block.getBoundingRectangle();

  const onScreen =
    bounds.right > view.left &&
    bounds.left < view.left + view.width &&
    bounds.bottom > view.top &&
    bounds.top < view.top + view.height;

  if (!onScreen) workspace.centerOnBlock(block.id);
}
