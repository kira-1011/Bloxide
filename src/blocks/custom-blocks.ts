// Before our definitions, so the text slot below replaces Blockly's rather
// than being replaced by it.
import "blockly/blocks";
import { Blocks, common } from "blockly/core";

// Bloxide's own blocks, as JSON definitions.
//
// Every value is an `input_value`, never an inline field, so a block carries no
// editable field of its own — the shape Scratch uses, and what lets
// `go to x () y ()` hold two values. Their shadow defaults live with the palette.

/** Repeat is Blockly's own: same shape, and its generator already traps. */
export const REPEAT_BLOCK_TYPE = "controls_repeat_ext";

const DEFINITIONS = [
  {
    type: "bloxide_move",
    message0: "move %1 steps",
    args0: [{ type: "input_value", name: "STEPS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    style: "movement_blocks",
    tooltip: "Move the sprite forwards.",
  },
  {
    type: "bloxide_turn_right",
    message0: "turn right %1 degrees",
    args0: [{ type: "input_value", name: "DEGREES", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    style: "movement_blocks",
    tooltip: "Turn the sprite clockwise.",
  },
  {
    type: "bloxide_turn_left",
    message0: "turn left %1 degrees",
    args0: [{ type: "input_value", name: "DEGREES", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    style: "movement_blocks",
    tooltip: "Turn the sprite anticlockwise.",
  },
  {
    type: "bloxide_go_to",
    message0: "go to x %1 y %2",
    args0: [
      { type: "input_value", name: "X", check: "Number" },
      { type: "input_value", name: "Y", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "movement_blocks",
    tooltip: "Put the sprite at a place on the stage.",
  },
  {
    type: "bloxide_say_for",
    message0: "say %1 for %2 secs",
    args0: [
      { type: "input_value", name: "TEXT" },
      { type: "input_value", name: "SECONDS", check: "Number" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "say_blocks",
    tooltip: "Show a speech bubble for a while, then clear it.",
  },
  {
    type: "bloxide_say",
    message0: "say %1",
    args0: [{ type: "input_value", name: "TEXT" }],
    previousStatement: null,
    nextStatement: null,
    style: "say_blocks",
    tooltip: "Show a speech bubble and leave it there.",
  },
  {
    type: "bloxide_change_size",
    message0: "change size by %1",
    args0: [{ type: "input_value", name: "CHANGE", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    style: "look_blocks",
    tooltip: "Make the sprite bigger or smaller.",
  },
  {
    type: "bloxide_hide",
    message0: "hide",
    previousStatement: null,
    nextStatement: null,
    style: "look_blocks",
    tooltip: "Make the sprite invisible.",
  },
  {
    type: "bloxide_show",
    message0: "show",
    previousStatement: null,
    nextStatement: null,
    style: "look_blocks",
    tooltip: "Make the sprite visible again.",
  },
  {
    type: "bloxide_wait",
    message0: "wait %1 seconds",
    args0: [{ type: "input_value", name: "SECONDS", check: "Number" }],
    previousStatement: null,
    nextStatement: null,
    style: "control_blocks",
    tooltip: "Pause before the next block.",
  },
  {
    type: "bloxide_forever",
    message0: "forever",
    // Its own row, as Blockly's repeat does it: sharing the label's row would
    // make the whole word the arm and open the mouth beside it.
    message1: "%1",
    args1: [{ type: "input_statement", name: "DO" }],
    previousStatement: null,
    // No nextStatement: forever never ends, so nothing can follow it. Scratch
    // caps the block for the same reason.
    style: "control_blocks",
    tooltip: "Run the blocks inside over and over.",
  },
] as const;

/**
 * The definitions themselves, so the palette can draw a block the way Blockly
 * draws it rather than keeping a second copy of the wording.
 */
export const BLOCK_DEFINITIONS = DEFINITIONS;

/** Every type this module defines, plus the repeat block it borrows. */
export const SPRITE_BLOCK_TYPES: readonly string[] = [
  ...DEFINITIONS.map((definition) => definition.type),
  REPEAT_BLOCK_TYPE,
];

// Kept as values rather than using `defineBlocksWithJsonArray`, so the
// definitions can be read and tested instead of only taking effect.
export const SPRITE_BLOCKS = common.createBlockDefinitionsFromJsonArray([...DEFINITIONS]);

common.defineBlocks(SPRITE_BLOCKS);

/**
 * Blockly's own `text`, without the quote marks. A block whose only content is
 * one field is drawn by zelos as that field alone, so a text slot becomes the
 * same white pill a number is, as DESIGN.md draws both. The field keeps
 * Blockly's name, so the generator and everything that sets a value still work.
 */
const TEXT_SLOT = common.createBlockDefinitionsFromJsonArray([
  {
    type: "text",
    message0: "%1",
    args0: [{ type: "field_input", name: "TEXT", text: "" }],
    output: "String",
    style: "text_blocks",
  },
]).text;
// Assigned rather than passed to defineBlocks, which warns on every override.
if (TEXT_SLOT) Blocks["text"] = TEXT_SLOT;
