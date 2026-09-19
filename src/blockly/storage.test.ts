import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, describe, expect, it } from "vitest";
import { clearWorkspace, loadWorkspace, saveWorkspace } from "@/blockly/storage";
import { initBlocklyLocale } from "@/blockly/locale";

// Block definitions interpolate Blockly.Msg; without messages newBlock throws.
initBlocklyLocale();

const STORAGE_KEY = "bloxide/workspace";

/** A headless workspace is enough: serialization never touches the DOM. */
function makeWorkspace() {
  return new Blockly.Workspace();
}

afterEach(() => {
  localStorage.clear();
});

describe("workspace storage", () => {
  it("round-trips a program through localStorage", () => {
    const source = makeWorkspace();
    source.newBlock("controls_repeat_ext");

    saveWorkspace(source);
    const restored = makeWorkspace();
    loadWorkspace(restored);

    expect(restored.getAllBlocks(false)).toHaveLength(1);
    expect(restored.getAllBlocks(false)[0]?.type).toBe("controls_repeat_ext");
  });

  it("leaves the workspace alone when nothing is stored", () => {
    const workspace = makeWorkspace();

    loadWorkspace(workspace);

    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it("discards a corrupt payload instead of failing to open", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    const workspace = makeWorkspace();

    expect(() => loadWorkspace(workspace)).not.toThrow();
    // The bad entry is dropped, so the next load starts clean.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("discards an array payload, which is an object but not a workspace", () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    const workspace = makeWorkspace();

    expect(() => loadWorkspace(workspace)).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps events disabled while loading, so a restore is not a change", () => {
    const source = makeWorkspace();
    source.newBlock("text_print");
    saveWorkspace(source);

    const restored = makeWorkspace();
    const seen: Blockly.Events.Abstract[] = [];
    restored.addChangeListener((event) => seen.push(event));

    loadWorkspace(restored);

    expect(seen).toHaveLength(0);
  });

  it("clears the saved program", () => {
    const workspace = makeWorkspace();
    workspace.newBlock("text_print");
    saveWorkspace(workspace);

    clearWorkspace();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
