import * as Blockly from "blockly/core";

const STORAGE_KEY = "bloxide/workspace";

/**
 * Persists the program so a reload never costs the work so far. The
 * `saveProgram` / `loadProgram` capabilities call these.
 */
export function saveWorkspace(workspace: Blockly.Workspace): void {
  const data = Blockly.serialization.workspaces.save(workspace);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private windows and blocked site data throw on write.
  }
}

export function loadWorkspace(workspace: Blockly.Workspace): void {
  let data: string | null = null;
  try {
    data = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!data) return;

  // Events off, or restoring reads as new work having just been done.
  Blockly.Events.disable();
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not a workspace");

    // v13 takes an options object here, not the codelab's positional boolean.
    Blockly.serialization.workspaces.load(parsed, workspace, { recordUndo: false });
  } catch {
    // A corrupt payload must not stop the editor from opening.
    clearWorkspace();
  } finally {
    Blockly.Events.enable();
  }
}

export function clearWorkspace(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See saveWorkspace.
  }
}
