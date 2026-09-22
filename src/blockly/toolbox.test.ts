import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { describe, expect, it } from "vitest";
import { initBlocklyLocale } from "@/blockly/locale";
import { BLOCK_TYPES, resolveBlockType, spokenName, TOOLBOX_CATEGORIES } from "@/blockly/toolbox";

// Blockly ships no messages, so a block whose text comes from one cannot be
// built without this.
initBlocklyLocale();

const categories = TOOLBOX_CATEGORIES;

const blockTypes = BLOCK_TYPES;

const spokenNames = categories.flatMap((category) =>
  category.contents.flatMap((entry) => entry.say),
);

describe("the spoken vocabulary", () => {
  it("gives no word to two blocks", () => {
    // resolveBlockType is first match over one flat list, so a word claimed
    // twice would resolve to whichever block came first — and be confirmed as
    // confidently as a right answer. A bare "turn" is the one to avoid.
    expect(new Set(spokenNames).size).toBe(spokenNames.length);
  });

  it("says nothing that could never be matched", () => {
    // What arrives is trimmed, lowercased and stripped of a trailing "block",
    // so a name in any other shape is unreachable.
    for (const name of spokenNames) {
      expect(name, `${name} is not how a heard word arrives`).toBe(
        name.trim().toLowerCase().replace(/\s+/g, " "),
      );
      expect(name.endsWith(" block")).toBe(false);
    }
  });

  it("resolves a name to its own block", () => {
    for (const category of categories) {
      for (const entry of category.contents) {
        for (const name of entry.say) {
          expect(resolveBlockType(name), `${name}`).toBe(entry.type);
        }
      }
    }
  });

  it("refuses a word that would have to guess between two blocks", () => {
    expect(resolveBlockType("turn")).toBeNull();
  });

  it("answers to the sprite's blocks, not the words the old set claimed", () => {
    expect(resolveBlockType("say")).toBe("bloxide_say");
    expect(resolveBlockType("show")).toBe("bloxide_show");
    expect(resolveBlockType("print")).toBeNull();
  });

  it("names a block by a word, never by its type id", () => {
    expect(spokenName("bloxide_move")).toBe("move");
    // Blockly's repeat, borrowed: the id is never said out loud.
    expect(spokenName("controls_repeat_ext")).toBe("repeat");
  });
});

describe("TOOLBOX", () => {
  it("offers every block through a named category", () => {
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(category.kind).toBe("category");
      expect(category.name).toBeTruthy();
      expect(category.contents.length).toBeGreaterThan(0);
    }
  });

  it("carries DESIGN.md's four categories, in its order", () => {
    expect(categories.map((category) => category.name)).toEqual([
      "Movement",
      "Say",
      "Look",
      "Control",
    ]);
    expect(blockTypes).toHaveLength(12);
  });

  it("gives every value input a default, so no block arrives with a hole", () => {
    for (const category of categories) {
      for (const entry of category.contents) {
        const block = new Blockly.Workspace().newBlock(entry.type);
        const valueInputs = block.inputList.filter(
          (input) => input.connection?.type === Blockly.ConnectionType.INPUT_VALUE,
        );
        expect(new Set(Object.keys(entry.inputs ?? {})), `${entry.type}`).toEqual(
          new Set(valueInputs.map((input) => input.name)),
        );
      }
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
