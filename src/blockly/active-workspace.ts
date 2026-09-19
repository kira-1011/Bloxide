import type * as Blockly from "blockly/core";

let active: Blockly.WorkspaceSvg | null = null;

/** Voice handlers register at module scope and never see a component. */
export function setActiveWorkspace(workspace: Blockly.WorkspaceSvg | null): void {
  active = workspace;
}

export function getActiveWorkspace(): Blockly.WorkspaceSvg {
  if (!active) throw new Error("No workspace is open yet.");
  return active;
}

export function hasActiveWorkspace(): boolean {
  return active !== null;
}
