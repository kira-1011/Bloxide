/**
 * The blocks a child may ask for, in the order the palette shows them.
 *
 * Placeholder data: these describe what the palette draws, not blocks the
 * workspace can make yet. The Bloxide block definitions replace `type` with
 * real registered names.
 */

export type CategoryId = "movement" | "say" | "look" | "control";

export interface Category {
  readonly id: CategoryId;
  /** Shown on the rail and above the group. Spoken, so no jargon. */
  readonly label: string;
  /** A token class, because DESIGN.md gives each category exactly one fill. */
  readonly fill: string;
}

/** A run of literal words, or a slot the child fills by speaking a value. */
export type BlockPart = { readonly word: string } | { readonly slot: string };

/** A part with the identity React needs: two slots can hold the same value. */
export type KeyedPart = BlockPart & { readonly key: string };

export interface PaletteBlock {
  readonly id: string;
  readonly category: CategoryId;
  readonly parts: readonly KeyedPart[];
}

interface BlockSpec {
  readonly id: string;
  readonly category: CategoryId;
  readonly parts: readonly BlockPart[];
}

/** Parts are authored in order and never reorder, so position names them. */
function keyed(specs: readonly BlockSpec[]): readonly PaletteBlock[] {
  return specs.map((spec) => ({
    ...spec,
    parts: spec.parts.map((part, index) => ({ ...part, key: `${spec.id}-${index}` })),
  }));
}

export const CATEGORIES: readonly Category[] = [
  { id: "movement", label: "Movement", fill: "bg-cat-movement" },
  { id: "say", label: "Say", fill: "bg-cat-say" },
  { id: "look", label: "Look", fill: "bg-cat-look" },
  { id: "control", label: "Control", fill: "bg-cat-control" },
];

export const PALETTE_BLOCKS: readonly PaletteBlock[] = keyed([
  {
    id: "move",
    category: "movement",
    parts: [{ word: "move" }, { slot: "10" }, { word: "steps" }],
  },
  {
    id: "turn-right",
    category: "movement",
    parts: [{ word: "turn right" }, { slot: "15" }, { word: "degrees" }],
  },
  {
    id: "turn-left",
    category: "movement",
    parts: [{ word: "turn left" }, { slot: "15" }, { word: "degrees" }],
  },
  {
    id: "go-to",
    category: "movement",
    parts: [{ word: "go to x" }, { slot: "0" }, { word: "y" }, { slot: "0" }],
  },
  {
    id: "say-for",
    category: "say",
    parts: [{ word: "say" }, { slot: "Hello!" }, { word: "for" }, { slot: "2" }, { word: "secs" }],
  },
  { id: "say", category: "say", parts: [{ word: "say" }, { slot: "Hello!" }] },
  { id: "change-size", category: "look", parts: [{ word: "change size by" }, { slot: "10" }] },
  { id: "hide", category: "look", parts: [{ word: "hide" }] },
  { id: "show", category: "look", parts: [{ word: "show" }] },
  {
    id: "wait",
    category: "control",
    parts: [{ word: "wait" }, { slot: "1" }, { word: "seconds" }],
  },
  { id: "repeat", category: "control", parts: [{ word: "repeat" }, { slot: "10" }] },
  { id: "forever", category: "control", parts: [{ word: "forever" }] },
  // The empty slot has nothing to fill it until a sensing block exists. Known
  // gap, listed in DESIGN.md rather than hidden.
  { id: "repeat-until", category: "control", parts: [{ word: "repeat until" }, { slot: "" }] },
  { id: "wait-until", category: "control", parts: [{ word: "wait until" }, { slot: "" }] },
]);

export function blocksIn(category: CategoryId): readonly PaletteBlock[] {
  return PALETTE_BLOCKS.filter((block) => block.category === category);
}
