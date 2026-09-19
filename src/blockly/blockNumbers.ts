import type * as Blockly from "blockly/core";
import { BlockNumberIcon } from "@/blockly/BlockNumberIcon";

/**
 * Numbers every block so one can be named out loud — the floor AGENTS.md asks
 * for, when the implicit target is wrong and a type name is ambiguous.
 *
 * Workspace order, which is the order the agent is told about, so the badge and
 * the agent can never disagree.
 */
export function numberBlocks(workspace: Blockly.Workspace): void {
  workspace.getAllBlocks(true).forEach((block, index) => {
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

/** Resolves "block three" to the block wearing that number. */
export function findBlockByNumber(
  workspace: Blockly.Workspace,
  number: number,
): Blockly.Block | null {
  return workspace.getAllBlocks(true)[number - 1] ?? null;
}

/** The number a block is wearing, for speaking it back. */
export function getBlockNumber(block: Blockly.Block): number | null {
  return block.getIcon(BlockNumberIcon.TYPE)?.getNumber() ?? null;
}
