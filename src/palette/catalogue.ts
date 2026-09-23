import { TOOLBOX_CATEGORIES } from "@/blockly/toolbox";

/**
 * What the palette draws, derived from the toolbox rather than written out
 * again. A block the child can be given is therefore always a block the
 * palette shows, and neither list can quietly fall behind the other.
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

export interface PaletteBlock {
  readonly id: string;
  readonly category: CategoryId;
  readonly parts: readonly KeyedPart[];
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
 * How each block reads on screen. The toolbox knows the words a child may say
 * and the value each slot starts with, but not the order they are spoken in,
 * which is what a block has to show.
 */
const WORDING: Record<string, readonly BlockPart[]> = {
  bloxide_move: [{ word: "move" }, { slot: "10" }, { word: "steps" }],
  bloxide_turn_right: [{ word: "turn right" }, { slot: "15" }, { word: "degrees" }],
  bloxide_turn_left: [{ word: "turn left" }, { slot: "15" }, { word: "degrees" }],
  bloxide_go_to: [{ word: "go to x" }, { slot: "0" }, { word: "y" }, { slot: "0" }],
  bloxide_say_for: [
    { word: "say" },
    { slot: "Hello!" },
    { word: "for" },
    { slot: "2" },
    { word: "secs" },
  ],
  bloxide_say: [{ word: "say" }, { slot: "Hello!" }],
  bloxide_change_size: [{ word: "change size by" }, { slot: "10" }],
  bloxide_hide: [{ word: "hide" }],
  bloxide_show: [{ word: "show" }],
  bloxide_wait: [{ word: "wait" }, { slot: "1" }, { word: "seconds" }],
  controls_repeat_ext: [{ word: "repeat" }, { slot: "10" }],
  bloxide_forever: [{ word: "forever" }],
};

/** Parts are authored in order and never reorder, so position names them. */
export const PALETTE_BLOCKS: readonly PaletteBlock[] = TOOLBOX_CATEGORIES.flatMap((category) =>
  category.contents.map((entry) => ({
    id: entry.type,
    category: category.name.toLowerCase() as CategoryId,
    // A block with no wording still shows, under its first spoken name, rather
    // than going missing from the one list that says what may be asked for.
    parts: (WORDING[entry.type] ?? [{ word: entry.say[0] ?? entry.type }]).map((part, index) => ({
      ...part,
      key: `${entry.type}-${index}`,
    })),
  })),
);

export function blocksIn(category: CategoryId): readonly PaletteBlock[] {
  return PALETTE_BLOCKS.filter((block) => block.category === category);
}
