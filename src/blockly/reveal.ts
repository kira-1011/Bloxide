import type * as Blockly from "blockly/core";

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
