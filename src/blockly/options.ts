import type * as Blockly from "blockly/core";
import { RENDERER_NAME } from "@/blockly/renderer";
import { BLOXIDE_THEME } from "@/blockly/theme";

/** Module scope: a fresh object each render would re-inject the workspace. */
export const WORKSPACE_OPTIONS: Blockly.BlocklyOptions = {
  renderer: RENDERER_NAME,
  theme: BLOXIDE_THEME,
  media: "/blockly-media/",
  grid: { spacing: 24, length: 3, colour: "#e5e7eb", snap: true },
  // Zoom and delete are our own buttons (WorkspaceControls), drawn in the UI's style.
  zoom: { controls: false, wheel: true, startScale: 0.9 },
  move: { scrollbars: true, drag: true, wheel: false },
  trashcan: false,
};
