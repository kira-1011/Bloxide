import type * as Blockly from "blockly/core";
import { resolveBlockType } from "@/blockly/toolbox";

let lastBlockId: string | null = null;

/**
 * The implicit target: the block just created. AGENTS.md makes this the
 * default reference, so "make it ten steps" needs no reference at all.
 */
export function rememberBlock(block: Blockly.Block): void {
  lastBlockId = block.id;
}

export function forgetBlock(block: Blockly.Block): void {
  if (lastBlockId === block.id) lastBlockId = null;
}

/**
 * Resolves the reference: the implicit target when none was given,
 * otherwise the last block of the named type.
 *
 * Positional ("the second repeat") and the numeric overlay are not built yet,
 * so a named type resolves to the bottom-most match in workspace order.
 */
export function resolveBlock(
  workspace: Blockly.Workspace,
  reference?: string,
): Blockly.Block | null {
  if (!reference) {
    return lastBlockId ? workspace.getBlockById(lastBlockId) : null;
  }

  const type = resolveBlockType(reference);
  if (!type) return null;

  const matches = workspace.getBlocksByType(type, true);
  return matches.at(-1) ?? null;
}
