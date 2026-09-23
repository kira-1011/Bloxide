import type * as Blockly from "blockly/core";

export const ZOOM_DIRECTIONS = ["in", "out", "reset"] as const;

export type ZoomDirection = (typeof ZOOM_DIRECTIONS)[number];

/** A model can send any word, so the direction is narrowed here. */
export function isZoomDirection(value: string): value is ZoomDirection {
  return ZOOM_DIRECTIONS.some((direction) => direction === value);
}

/** One step, the same step Blockly's own zoom buttons take. */
export function zoomWorkspace(workspace: Blockly.WorkspaceSvg, direction: ZoomDirection): void {
  if (direction === "reset") {
    workspace.setScale(workspace.options.zoomOptions.startScale);
    workspace.scrollCenter();
    return;
  }
  workspace.zoomCenter(direction === "in" ? 1 : -1);
}
