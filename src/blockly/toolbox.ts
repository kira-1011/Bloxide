import type * as Blockly from "blockly/core";

interface BlockEntry {
  kind: "block";
  type: string;
}

interface Category {
  kind: "category";
  name: string;
  categorystyle: string;
  contents: BlockEntry[];
}

const CATEGORIES: Category[] = [
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
];

/** Starter toolbox built from Blockly's own library blocks. */
export const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  contents: CATEGORIES,
};

/**
 * The same types the toolbox offers, as the enum the voice agent picks from.
 * Derived so a block can never be reachable by hand but not by voice.
 */
export const BLOCK_TYPES: readonly string[] = CATEGORIES.flatMap((category) =>
  category.contents.map((entry) => entry.type),
);
