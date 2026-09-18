import type * as Blockly from "blockly/core";
import { TOOLBOX } from "./toolbox";

/**
 * Frozen at module scope: a new options object on every render would re-inject
 * the workspace and throw away the child's program.
 */
export const WORKSPACE_OPTIONS: Blockly.BlocklyOptions = {
  toolbox: TOOLBOX,
  renderer: "zelos",
  media: "/blockly-media/",
  grid: { spacing: 24, length: 3, colour: "#e5e7eb", snap: true },
  zoom: { controls: true, wheel: true, startScale: 0.9 },
  move: { scrollbars: true, drag: true, wheel: false },
  trashcan: true,
};
