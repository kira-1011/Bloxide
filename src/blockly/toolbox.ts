import type * as Blockly from "blockly/core";

interface BlockEntry {
  kind: "block";
  type: string;
  /** What a child calls this block. Blockly's type ids are not sayable. */
  say: readonly string[];
}

interface Category {
  kind: "category";
  name: string;
  categorystyle: string;
  contents: readonly BlockEntry[];
}

// `as const` is what gives BlockType its literal union; `satisfies` keeps the
// shape checked without widening it back to string.
const CATEGORIES = [
  {
    kind: "category",
    name: "Logic",
    categorystyle: "logic_category",
    contents: [
      { kind: "block", type: "controls_if", say: ["if", "if then"] },
      { kind: "block", type: "logic_compare", say: ["compare", "comparison", "equals"] },
    ],
  },
  {
    kind: "category",
    name: "Loops",
    categorystyle: "loop_category",
    contents: [{ kind: "block", type: "controls_repeat_ext", say: ["repeat", "loop"] }],
  },
  {
    kind: "category",
    name: "Math",
    categorystyle: "math_category",
    contents: [
      { kind: "block", type: "math_number", say: ["number"] },
      { kind: "block", type: "math_arithmetic", say: ["math", "arithmetic", "sum"] },
    ],
  },
  {
    kind: "category",
    name: "Text",
    categorystyle: "text_category",
    contents: [
      { kind: "block", type: "text", say: ["text", "words", "string"] },
      { kind: "block", type: "text_print", say: ["print", "say", "show"] },
    ],
  },
] as const satisfies readonly Category[];

/** Starter toolbox built from Blockly's own library blocks. */
export const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  // Copied because Blockly wants a mutable array and CATEGORIES is frozen.
  contents: CATEGORIES.map((category) => ({
    ...category,
    contents: category.contents.map(({ kind, type }) => ({ kind, type })),
  })),
};

export type BlockType = (typeof CATEGORIES)[number]["contents"][number]["type"];

interface ResolvedEntry {
  readonly type: BlockType;
  readonly say: readonly string[];
}

// Annotated: flatMap over a const tuple of unlike categories widens to unknown.
const ENTRIES: readonly ResolvedEntry[] = CATEGORIES.flatMap((category) => [...category.contents]);

/**
 * The same types the toolbox offers, as the enum the voice agent picks from.
 * Derived so a block can never be reachable by hand but not by voice.
 */
export const BLOCK_TYPES: readonly BlockType[] = ENTRIES.map((entry) => entry.type);

function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ block$/, "");
}

/**
 * Resolves whatever the agent sent to a type we ship, or null.
 *
 * The enum steers the model towards type ids but enforces nothing, so a child's
 * word still arrives sometimes. Rejecting "repeat" would dead-end the one
 * sentence the README teaches.
 */
export function resolveBlockType(value: string): BlockType | null {
  const wanted = normalise(value);

  for (const entry of ENTRIES) {
    if (entry.type === value) return entry.type;
    if (entry.say.some((name) => name === wanted)) return entry.type;
  }

  return null;
}
