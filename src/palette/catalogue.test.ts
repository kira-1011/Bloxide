import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { describe, expect, it } from "vitest";
import { initBlocklyLocale } from "@/blockly/locale";
import { BLOCK_TYPES } from "@/blockly/toolbox";
import { blocksIn, CATEGORIES, PALETTE_BLOCKS } from "@/palette/catalogue";

initBlocklyLocale();

/** "move [10] steps", so a wording is readable in a failure message. */
function reads(id: string): string {
  const block = PALETTE_BLOCKS.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`no palette block for ${id}`);
  return block.parts.map((part) => ("word" in part ? part.word : `[${part.slot}]`)).join(" ");
}

describe("catalogue", () => {
  it("lists exactly the blocks the toolbox offers", () => {
    expect(PALETTE_BLOCKS.map((block) => block.id)).toEqual([...BLOCK_TYPES]);
  });

  it("words a block the way its own definition does", () => {
    expect(reads("bloxide_move")).toBe("move [10] steps");
    expect(reads("bloxide_change_size")).toBe("change size by [10]");
  });

  it("keeps two slots apart in a block that has two", () => {
    expect(reads("bloxide_go_to")).toBe("go to x [0] y [0]");
    expect(reads("bloxide_say_for")).toBe("say [Hello!] for [2] secs");
  });

  it("shows a block that takes nothing as plain words", () => {
    expect(reads("bloxide_hide")).toBe("hide");
  });

  it("drops the nest from a block that holds others", () => {
    // Its mouth is a place for blocks, not a value anyone can speak.
    expect(reads("bloxide_forever")).toBe("forever");
  });

  it("words the borrowed repeat block too", () => {
    expect(reads("controls_repeat_ext")).toBe("repeat [10] times");
  });

  it("puts every block in one of the four categories", () => {
    const grouped = CATEGORIES.flatMap((category) => blocksIn(category.id));
    expect(grouped).toHaveLength(PALETTE_BLOCKS.length);
    expect(CATEGORIES.map((category) => category.label)).toEqual([
      "Movement",
      "Say",
      "Look",
      "Control",
    ]);
  });
});

/** The block Blockly actually builds, to check the drawn shape against. */
function built(type: string): Blockly.Block {
  const workspace = new Blockly.Workspace();
  return workspace.newBlock(type);
}

describe("catalogue shapes", () => {
  it("gives every block the silhouette its own definition asks Blockly for", () => {
    for (const block of PALETTE_BLOCKS) {
      const real = built(block.id);
      const statements = real.inputList.filter(
        (input) => input.type === Blockly.inputs.inputTypes.STATEMENT,
      );

      expect({ id: block.id, ...block.shape }).toEqual({
        id: block.id,
        socketTop: Boolean(real.previousConnection),
        tabBottom: Boolean(real.nextConnection),
        mouth: statements.length > 0,
      });
    }
  });

  it("stacks a plain block above and below", () => {
    const move = PALETTE_BLOCKS.find((block) => block.id === "bloxide_move");
    expect(move?.shape).toEqual({ socketTop: true, tabBottom: true, mouth: false });
  });

  it("caps forever, because nothing can follow it", () => {
    const forever = PALETTE_BLOCKS.find((block) => block.id === "bloxide_forever");
    expect(forever?.shape).toEqual({ socketTop: true, tabBottom: false, mouth: true });
  });

  it("gives the borrowed repeat a mouth and a block after it", () => {
    const repeat = PALETTE_BLOCKS.find((block) => block.id === "controls_repeat_ext");
    expect(repeat?.shape).toEqual({ socketTop: true, tabBottom: true, mouth: true });
  });
});
