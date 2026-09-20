import type * as Blockly from "blockly/core";

/** Shadow blocks that fill a block's value slots, keyed by input name. */
type SlotDefaults = Readonly<Record<string, Blockly.serialization.blocks.ConnectionState>>;

interface BlockEntry {
  kind: "block";
  type: string;
  /** Spoken names for this block. Blockly's type ids are not sayable. */
  say: readonly string[];
  /**
   * What fills the block's value inputs when it is made.
   *
   * An empty value input is a hole, and the only way to fill one is to drop a
   * block into it — the one thing our users cannot do. A shadow is a default
   * that is already there to be spoken over.
   */
  inputs?: SlotDefaults;
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
      {
        kind: "block",
        type: "logic_compare",
        say: ["compare", "comparison", "equals"],
        inputs: {
          A: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          B: { shadow: { type: "math_number", fields: { NUM: 1 } } },
        },
      },
    ],
  },
  {
    kind: "category",
    name: "Loops",
    categorystyle: "loop_category",
    contents: [{ kind: "block", type: "controls_repeat", say: ["repeat", "loop"] }],
  },
  {
    kind: "category",
    name: "Math",
    categorystyle: "math_category",
    contents: [
      { kind: "block", type: "math_number", say: ["number"] },
      {
        kind: "block",
        type: "math_arithmetic",
        say: ["math", "arithmetic", "sum"],
        inputs: {
          A: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          B: { shadow: { type: "math_number", fields: { NUM: 1 } } },
        },
      },
    ],
  },
  {
    kind: "category",
    name: "Text",
    categorystyle: "text_category",
    contents: [
      { kind: "block", type: "text", say: ["text", "words", "string"] },
      {
        kind: "block",
        type: "text_print",
        say: ["print", "say", "show"],
        inputs: { TEXT: { shadow: { type: "text", fields: { TEXT: "" } } } },
      },
    ],
  },
] as const satisfies readonly Category[];

/** Starter toolbox built from Blockly's own library blocks. */
export const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  // Copied because Blockly wants a mutable array and CATEGORIES is frozen.
  contents: CATEGORIES.map((category) => ({
    ...category,
    contents: category.contents.map((entry) => ({
      kind: entry.kind,
      type: entry.type,
      // The flyout draws the shadows too, so a block looks the same however it
      // was made.
      ...("inputs" in entry ? { inputs: entry.inputs } : {}),
    })),
  })),
};

export type BlockType = (typeof CATEGORIES)[number]["contents"][number]["type"];

/** Typed view of the same data, so readers never cast TOOLBOX open. */
export const TOOLBOX_CATEGORIES: readonly Category[] = CATEGORIES;

interface ResolvedEntry {
  readonly type: BlockType;
  readonly say: readonly string[];
  readonly inputs?: SlotDefaults;
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
 * The enum steers the model towards type ids but enforces nothing, so a spoken
 * word still arrives sometimes. Rejecting "repeat" would dead-end the one
 * sentence the README teaches.
 */
/** The shadow defaults for a type, for whoever is making the block. */
export function slotDefaults(type: BlockType): SlotDefaults | undefined {
  return ENTRIES.find((entry) => entry.type === type)?.inputs;
}

export function resolveBlockType(value: string): BlockType | null {
  const wanted = normalise(value);

  for (const entry of ENTRIES) {
    if (entry.type === value) return entry.type;
    if (entry.say.some((name) => name === wanted)) return entry.type;
  }

  return null;
}
