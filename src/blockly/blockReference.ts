import type * as Blockly from "blockly/core";
import { getBlockNumber } from "@/blockly/blockView";
import { resolveBlockType } from "@/blockly/toolbox";

let lastBlockId: string | null = null;

/**
 * Finds the block wearing a badge — by the badge, not by position: Blockly
 * queues its events, so between a change and the next renumber the order can
 * differ from what is on screen. What the speaker can see has to win.
 */
export function findBlockByNumber(
  workspace: Blockly.Workspace,
  number: number,
): Blockly.Block | null {
  return workspace.getAllBlocks(true).find((block) => getBlockNumber(block) === number) ?? null;
}

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
  /** The number shown on the block, which beats every other reference. */
  readonly number?: number;
}

/**
 * Resolves the reference, most specific first: the number on screen, then the
 * named type, then the implicit target.
 *
 * A number is unambiguous and survives a misheard word, which is why it wins.
 * Positional reference ("the second repeat") is not built, so a named type
 * still resolves to the last match in workspace order.
 */
export function resolveBlock(
  workspace: Blockly.Workspace,
  reference?: string,
  { exclude, number }: ResolveOptions = {},
): Blockly.Block | null {
  if (number !== undefined) {
    const numbered = findBlockByNumber(workspace, number);
    return numbered && numbered.id !== exclude ? numbered : null;
  }

  if (!reference) {
    if (!lastBlockId || lastBlockId === exclude) return null;
    return workspace.getBlockById(lastBlockId);
  }

  const type = resolveBlockType(reference);
  if (!type) return null;

  const matches = workspace.getBlocksByType(type, true).filter((block) => block.id !== exclude);
  return matches.at(-1) ?? null;
}
