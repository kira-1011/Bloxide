import type * as Blockly from "blockly/core";
import { BLOXIDE_THEME } from "@/blockly/theme";

/** Module scope: a fresh object each render would re-inject the workspace. */
export const WORKSPACE_OPTIONS: Blockly.BlocklyOptions = {
  renderer: "zelos",
  theme: BLOXIDE_THEME,
  media: "/blockly-media/",
  grid: { spacing: 24, length: 3, colour: "#e5e7eb", snap: true },
  zoom: { controls: true, wheel: true, startScale: 0.9 },
  move: { scrollbars: true, drag: true, wheel: false },
  trashcan: true,
};
