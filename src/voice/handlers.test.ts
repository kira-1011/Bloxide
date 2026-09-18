import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setActiveWorkspace } from "@/blockly/activeWorkspace";
import { initBlocklyLocale } from "@/blockly/locale";
import { addBlock } from "@/voice/handlers";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
  setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
});

afterEach(() => {
  setActiveWorkspace(null);
});

describe("addBlock", () => {
  it("adds the block the agent asked for", async () => {
    const spoken = await addBlock({ type: "controls_repeat_ext" });

    expect(workspace.getAllBlocks(false)).toHaveLength(1);
    expect(workspace.getAllBlocks(false)[0]?.type).toBe("controls_repeat_ext");
    expect(spoken).toContain("Added");
  });

  it("says so instead of throwing when the type is not a block", async () => {
    // What a child actually says. The model passes the word through, and
    // Blockly's id for this block is controls_repeat_ext.
    const spoken = await addBlock({ type: "repeat" });

    expect(spoken).toBe("I do not know a block called repeat.");
    expect(workspace.getAllBlocks(false)).toHaveLength(0);
  });

  it("refuses when no workspace is open", async () => {
    setActiveWorkspace(null);

    await expect(addBlock({ type: "text_print" })).rejects.toThrow("No workspace is open yet.");
  });
});
