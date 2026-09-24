import { BLOCK_DEFINITIONS } from "@/blocks/custom-blocks";
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
 * The silhouette zelos gives a block, read off the same definition Blockly
 * renders from, so the palette entry and the workspace block are the same
 * object to look at.
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

interface Argument {
  readonly type: string;
  readonly name: string;
}

interface Definition {
  readonly message0: string;
  readonly args0?: readonly Argument[];
  readonly message1?: string;
  readonly args1?: readonly Argument[];
  /** `null` is how a JSON definition says "connects, checking nothing". */
  readonly previousStatement?: null;
  readonly nextStatement?: null;
}

/**
 * Repeat is Blockly's block, so its wording lives in Blockly's own messages
 * rather than in ours. Written out here because reading `Blockly.Msg` would
 * make the palette wait on the locale being installed first.
 */
const BORROWED: Record<string, Definition> = {
  controls_repeat_ext: {
    message0: "repeat %1 times",
    args0: [{ type: "input_value", name: "TIMES" }],
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    nextStatement: null,
  },
};

const DEFINITIONS: ReadonlyMap<string, Definition> = new Map<string, Definition>([
  ...BLOCK_DEFINITIONS.map((definition): [string, Definition] => [definition.type, definition]),
  ...Object.entries(BORROWED),
]);

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
  if (!definition) return [{ word: type }];

  const parts: BlockPart[] = [];
  for (const piece of definition.message0.split(/(%\d+)/)) {
    const placeholder = /^%(\d+)$/.exec(piece);
    if (!placeholder) {
      const word = piece.trim();
      if (word) parts.push({ word });
      continue;
    }

    const argument = definition.args0?.[Number(placeholder[1]) - 1];
    if (!argument || argument.type !== "input_value") continue;
    parts.push({ slot: slotValue(inputs, argument.name) });
  }
  return parts;
}

const NO_SHAPE: BlockShape = { socketTop: false, tabBottom: false, mouth: false };

/**
 * The three connections a definition states, as the three things to draw.
 *
 * A cap block such as `forever` simply omits `nextStatement`, so absence is the
 * test — a stated `null` still means the connection exists.
 */
function shapeOf(type: string): BlockShape {
  const definition = DEFINITIONS.get(type);
  if (!definition) return NO_SHAPE;

  const inputs = [...(definition.args0 ?? []), ...(definition.args1 ?? [])];
  return {
    socketTop: definition.previousStatement !== undefined,
    tabBottom: definition.nextStatement !== undefined,
    mouth: inputs.some((argument) => argument.type === "input_statement"),
  };
}

/** Parts are authored in order and never reorder, so position names them. */
export const PALETTE_BLOCKS: readonly PaletteBlock[] = TOOLBOX_CATEGORIES.flatMap((category) =>
  category.contents.map((entry) => ({
    id: entry.type,
    category: category.name.toLowerCase() as CategoryId,
    parts: partsOf(entry.type, entry.inputs).map((part, index) => ({
      ...part,
      key: `${entry.type}-${index}`,
    })),
    shape: shapeOf(entry.type),
  })),
);

export function blocksIn(category: CategoryId): readonly PaletteBlock[] {
  return PALETTE_BLOCKS.filter((block) => block.category === category);
}
