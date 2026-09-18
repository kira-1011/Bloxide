import type * as Blockly from "blockly/core";

interface BlockEntry {
  kind: "block";
  type: string;
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
      { kind: "block", type: "controls_if" },
      { kind: "block", type: "logic_compare" },
    ],
  },
  {
    kind: "category",
    name: "Loops",
    categorystyle: "loop_category",
    contents: [{ kind: "block", type: "controls_repeat_ext" }],
  },
  {
    kind: "category",
    name: "Math",
    categorystyle: "math_category",
    contents: [
      { kind: "block", type: "math_number" },
      { kind: "block", type: "math_arithmetic" },
    ],
  },
  {
    kind: "category",
    name: "Text",
    categorystyle: "text_category",
    contents: [
      { kind: "block", type: "text" },
      { kind: "block", type: "text_print" },
    ],
  },
] as const satisfies readonly Category[];

/** Starter toolbox built from Blockly's own library blocks. */
export const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  // Copied because Blockly wants a mutable array and CATEGORIES is frozen.
  contents: CATEGORIES.map((category) => ({ ...category, contents: [...category.contents] })),
};

export type BlockType = (typeof CATEGORIES)[number]["contents"][number]["type"];

/**
 * The same types the toolbox offers, as the enum the voice agent picks from.
 * Derived so a block can never be reachable by hand but not by voice.
 */
export const BLOCK_TYPES: readonly BlockType[] = CATEGORIES.flatMap((category) =>
  category.contents.map((entry) => entry.type),
);

export function isBlockType(value: string): value is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(value);
}
