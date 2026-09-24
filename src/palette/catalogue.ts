import * as Blockly from "blockly/core";
import { BLOCK_DEFINITIONS } from "@/blocks/custom-blocks";
import { initBlocklyLocale } from "@/blockly/locale";
import { TOOLBOX_CATEGORIES } from "@/blockly/toolbox";

/**
 * What the palette draws, derived from the blocks themselves.
 *
 * The list comes from the toolbox and the wording from each block's own
 * definition, so the palette cannot show a block that does not exist, miss one
 * that does, or word one differently from the way Blockly draws it.
 */

export type CategoryId = "movement" | "say" | "look" | "control";

export interface Category {
  readonly id: CategoryId;
  /** Shown on the rail and above the group. Spoken, so no jargon. */
  readonly label: string;
  /** A token class, because DESIGN.md gives each category exactly one fill. */
  readonly fill: string;
}

/** A run of literal words, or a slot holding the value it starts with. */
export type BlockPart = { readonly word: string } | { readonly slot: string };

/** A part with the identity React needs: two slots can hold the same value. */
export type KeyedPart = BlockPart & { readonly key: string };

/**
 * The silhouette zelos gives a block, read off the block Blockly itself builds,
 * so the palette entry and the workspace block are the same object to look at.
 */
export interface BlockShape {
  /** Something can connect above, so zelos indents the top edge. */
  readonly socketTop: boolean;
  /** Something can follow, so zelos hangs a tab under the bottom edge. */
  readonly tabBottom: boolean;
  /** The block holds a stack of others, so zelos draws it as a C. */
  readonly mouth: boolean;
}

export interface PaletteBlock {
  readonly id: string;
  readonly category: CategoryId;
  readonly parts: readonly KeyedPart[];
  readonly shape: BlockShape;
}

const FILLS: Record<CategoryId, string> = {
  movement: "bg-cat-movement",
  say: "bg-cat-say",
  look: "bg-cat-look",
  control: "bg-cat-control",
};

export const CATEGORIES: readonly Category[] = TOOLBOX_CATEGORIES.map((category) => {
  const id = category.name.toLowerCase() as CategoryId;
  return { id, label: category.name, fill: FILLS[id] };
});

/**
 * Repeat is Blockly's block, so only its wording is copied here. Its shape is
 * read off Blockly like every other block's; taking the words from
 * `Blockly.Msg` as well is a separate decision.
 */
const BORROWED: readonly Blockly.JsonBlockDefinition[] = [
  {
    type: "controls_repeat_ext",
    message0: "repeat %1 times",
    args0: [{ type: "input_value", name: "TIMES" }],
  },
];

const DEFINITIONS: ReadonlyMap<string, Blockly.JsonBlockDefinition> = new Map(
  [...BLOCK_DEFINITIONS, ...BORROWED].map((definition) => [definition.type, definition]),
);

/** The value a slot starts out holding, as the shadow block spells it. */
function slotValue(inputs: Record<string, unknown> | undefined, name: string): string {
  const slot = inputs?.[name] as { shadow?: { fields?: Record<string, unknown> } } | undefined;
  const fields = slot?.shadow?.fields;
  const value = fields?.["NUM"] ?? fields?.["TEXT"];
  return value === undefined ? "" : String(value);
}

/**
 * Turns "go to x %1 y %2" into the words and slots a child sees.
 *
 * A `%1` standing for a statement input is dropped: that is where blocks nest,
 * not a value anyone can say.
 */
function partsOf(type: string, inputs: Record<string, unknown> | undefined): BlockPart[] {
  const definition = DEFINITIONS.get(type);
  if (!definition?.message0) return [{ word: type }];

  const parts: BlockPart[] = [];
  for (const piece of definition.message0.split(/(%\d+)/)) {
    const placeholder = /^%(\d+)$/.exec(piece);
    if (!placeholder) {
      const word = piece.trim();
      if (word) parts.push({ word });
      continue;
    }

    // `JsonBlockArg` keeps an open-ended member, so the tag alone does not
    // narrow `name` down to a string.
    const argument = definition.args0?.[Number(placeholder[1]) - 1];
    if (argument?.type !== "input_value" || typeof argument.name !== "string") continue;
    parts.push({ slot: slotValue(inputs, argument.name) });
  }
  return parts;
}

/**
 * The three connections to draw, asked of the block Blockly builds.
 *
 * `jsonInit` is what turns `previousStatement` and an `input_statement` into
 * connections, so reading them back off the built block is the one answer that
 * cannot drift from the block the workspace renders. Working them out from the
 * JSON here would be a second copy of that same logic.
 */
function shapeOf(workspace: Blockly.Workspace, type: string): BlockShape {
  const block = workspace.newBlock(type);
  return {
    socketTop: Boolean(block.previousConnection),
    tabBottom: Boolean(block.nextConnection),
    mouth: block.inputList.some((input) => input.type === Blockly.inputs.inputTypes.STATEMENT),
  };
}

// Blockly's own blocks name their words through `%{BKY_…}`, and `jsonInit`
// throws on a reference it cannot expand, so the locale has to be installed
// before the first `newBlock`. Idempotent, and the palette already ships in the
// same lazy chunk as the editor that installs it.
initBlocklyLocale();

// Headless: no DOM, no renderer, no `inject`. It exists only to hold the blocks
// `shapeOf` reads, and nothing keeps them afterwards, so it is disposed as soon
// as the silhouettes are out.
const SHAPES = new Blockly.Workspace();

/** Parts are authored in order and never reorder, so position names them. */
export const PALETTE_BLOCKS: readonly PaletteBlock[] = TOOLBOX_CATEGORIES.flatMap((category) =>
  category.contents.map((entry) => ({
    id: entry.type,
    category: category.name.toLowerCase() as CategoryId,
    parts: partsOf(entry.type, entry.inputs).map((part, index) => ({
      ...part,
      key: `${entry.type}-${index}`,
    })),
    shape: shapeOf(SHAPES, entry.type),
  })),
);

SHAPES.dispose();

export function blocksIn(category: CategoryId): readonly PaletteBlock[] {
  return PALETTE_BLOCKS.filter((block) => block.category === category);
}
