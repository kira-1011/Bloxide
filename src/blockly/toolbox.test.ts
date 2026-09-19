import * as Blockly from "blockly/core";
import "blockly/blocks";
import { describe, expect, it } from "vitest";
import { BLOCK_TYPES, TOOLBOX_CATEGORIES } from "@/blockly/toolbox";

const categories = TOOLBOX_CATEGORIES;

const blockTypes = BLOCK_TYPES;

describe("TOOLBOX", () => {
  it("offers every block through a named category", () => {
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(category.kind).toBe("category");
      expect(category.name).toBeTruthy();
      expect(category.contents.length).toBeGreaterThan(0);
    }
  });

  it("names only block types Blockly actually defines", () => {
    // A typo here is invisible until a child opens the category and finds it
    // empty, so assert against the real registry.
    expect(blockTypes.length).toBeGreaterThan(0);
    for (const type of blockTypes) {
      expect(type, `unknown block type: ${type}`).toBeDefined();
      expect(Blockly.Blocks[type], `unknown block type: ${type}`).toBeDefined();
    }
  });
});
