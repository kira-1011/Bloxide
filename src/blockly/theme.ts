import { Theme, Themes } from "blockly/core";

// DESIGN.md gives each block category exactly one fill, and blocks name a style
// rather than a colour so the hex lives in one place.

const MOVEMENT = "#1D4ED8";
const SAY = "#A21CAF";
const LOOK = "#0E7490";
const CONTROL = "#C2410C";

// Blockly measures block text in points, DESIGN.md writes it in pixels, and the
// browser has 96 of one to 72 of the other.
const BLOCK_TEXT_PX = 27;
const BLOCK_TEXT_PT = (BLOCK_TEXT_PX * 72) / 96;

export const BLOXIDE_THEME: Theme = Theme.defineTheme("bloxide", {
  name: "bloxide",
  base: Themes.Zelos,
  blockStyles: {
    movement_blocks: { colourPrimary: MOVEMENT },
    say_blocks: { colourPrimary: SAY },
    look_blocks: { colourPrimary: LOOK },
    // Repeat is Blockly's `controls_repeat_ext`, which names Blockly's own loop
    // style; overriding it is what keeps the borrowed block in our palette.
    loop_blocks: { colourPrimary: CONTROL },
    control_blocks: { colourPrimary: CONTROL },
  },
  // The palette rail carries the same four fills, so a category reads the same
  // on the block and in the list it came from.
  categoryStyles: {
    movement_category: { colour: MOVEMENT },
    say_category: { colour: SAY },
    look_category: { colour: LOOK },
    control_category: { colour: CONTROL },
  },
  fontStyle: { family: '"Baloo 2", cursive', weight: "600", size: BLOCK_TEXT_PT },
  // A hat is a mouse instruction drawn on a block; DESIGN.md forbids one.
  startHats: false,
});
