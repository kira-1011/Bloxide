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

interface ResolveOptions {
  /** Id to skip, so a block is never resolved as its own target. */
  readonly exclude?: string;
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
  { exclude }: ResolveOptions = {},
): Blockly.Block | null {
  if (!reference) {
    if (!lastBlockId || lastBlockId === exclude) return null;
    return workspace.getBlockById(lastBlockId);
  }

  const type = resolveBlockType(reference);
  if (!type) return null;

  const matches = workspace.getBlocksByType(type, true).filter((block) => block.id !== exclude);
  return matches.at(-1) ?? null;
}
