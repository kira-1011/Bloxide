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
const numberSlot = (value: number) => ({ shadow: { type: "math_number", fields: { NUM: value } } });
const textSlot = (value: string) => ({ shadow: { type: "text", fields: { TEXT: value } } });

// `as const` is what gives BlockType its literal union; `satisfies` keeps the
// shape checked without widening it back to string.
//
// The four categories, their order and their default values are DESIGN.md's.
// The first spoken name of each block is the one said back in a confirmation.
const CATEGORIES = [
  {
    kind: "category",
    name: "Movement",
    categorystyle: "movement_category",
    contents: [
      {
        kind: "block",
        type: "bloxide_move",
        say: ["move", "move steps"],
        inputs: { STEPS: numberSlot(10) },
      },
      {
        kind: "block",
        type: "bloxide_turn_right",
        // Never a bare "turn": it would resolve to whichever turn block came
        // first and be confirmed as confidently as a right answer.
        say: ["turn right", "turn right degrees"],
        inputs: { DEGREES: numberSlot(15) },
      },
      {
        kind: "block",
        type: "bloxide_turn_left",
        say: ["turn left", "turn left degrees"],
        inputs: { DEGREES: numberSlot(15) },
      },
      {
        kind: "block",
        type: "bloxide_go_to",
        say: ["go to", "go to x y"],
        inputs: { X: numberSlot(0), Y: numberSlot(0) },
      },
    ],
  },
  {
    kind: "category",
    name: "Say",
    categorystyle: "say_category",
    contents: [
      {
        kind: "block",
        type: "bloxide_say_for",
        say: ["say for", "say for secs", "say for seconds"],
        inputs: { TEXT: textSlot("Hello!"), SECONDS: numberSlot(2) },
      },
      { kind: "block", type: "bloxide_say", say: ["say"], inputs: { TEXT: textSlot("Hello!") } },
    ],
  },
  {
    kind: "category",
    name: "Look",
    categorystyle: "look_category",
    contents: [
      {
        kind: "block",
        type: "bloxide_change_size",
        say: ["change size", "change size by"],
        inputs: { CHANGE: numberSlot(10) },
      },
      { kind: "block", type: "bloxide_hide", say: ["hide"] },
      { kind: "block", type: "bloxide_show", say: ["show"] },
    ],
  },
  {
    kind: "category",
    name: "Control",
    categorystyle: "control_category",
    contents: [
      {
        kind: "block",
        type: "bloxide_wait",
        say: ["wait", "wait seconds"],
        inputs: { SECONDS: numberSlot(1) },
      },
      // Blockly's own repeat, so its generator handles the loop trap. The type
      // id is never spoken.
      {
        kind: "block",
        type: "controls_repeat_ext",
        say: ["repeat", "loop"],
        inputs: { TIMES: numberSlot(10) },
      },
      { kind: "block", type: "bloxide_forever", say: ["forever"] },
    ],
  },
] as const satisfies readonly Category[];

/** The blocks a child may ask for, in the order DESIGN.md lists them. */
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

/**
 * What to call a block out loud.
 *
 * The first spoken name, not the type id: "Added a bloxide_move block" is not
 * a sentence to say to a child. Derived from the same list the agent picks
 * from, so a confirmation can never name something that cannot be asked for.
 */
export function spokenName(type: string): string {
  return ENTRIES.find((entry) => entry.type === type)?.say[0] ?? type;
}

export function resolveBlockType(value: string): BlockType | null {
  const wanted = normalise(value);

  for (const entry of ENTRIES) {
    if (entry.type === value) return entry.type;
    if (entry.say.some((name) => name === wanted)) return entry.type;
  }

  return null;
}
