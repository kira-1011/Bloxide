import * as Blockly from "blockly/core";
import "blockly/blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { editableField, setFieldValue } from "@/blockly/block-fields";
import { initBlocklyLocale } from "@/blockly/locale";
import { BLOCK_TYPES } from "@/blockly/toolbox";

initBlocklyLocale();

let workspace: Blockly.Workspace;

beforeEach(() => {
  workspace = new Blockly.Workspace();
});

describe("editableField", () => {
  it("finds the one value a block holds", () => {
    const number = workspace.newBlock("math_number");

    expect(editableField(number)?.name).toBe("NUM");
  });

  it("finds nothing on a block that holds no value", () => {
    expect(editableField(workspace.newBlock("text_print"))).toBeNull();
  });

  it("every block we ship holds at most one value", () => {
    // No capability names a field, which only works while this holds.
    for (const type of BLOCK_TYPES) {
      const block = workspace.newBlock(type);
      const editable = block.inputList.flatMap((input) =>
        input.fieldRow.filter((field) => field.EDITABLE),
      );
      expect(editable.length, `${type} has ${editable.length} editable fields`).toBeLessThan(2);
    }
  });
});

describe("setFieldValue", () => {
  it("sets how many times a loop repeats", () => {
    const loop = workspace.newBlock("controls_repeat");

    const change = setFieldValue(loop, "4");

    expect(change.ok).toBe(true);
    expect(loop.getFieldValue("TIMES")).toBe(4);
  });

  it("says back what the field made of the value, not what was asked for", () => {
    const loop = workspace.newBlock("controls_repeat");

    // The repeat count is a whole number, so 3.7 cannot stand.
    const change = setFieldValue(loop, "3.7");

    expect(change.spoken).toContain(String(loop.getFieldValue("TIMES")));
  });

  it("sets what a piece of text says, verbatim", () => {
    const text = workspace.newBlock("text");

    setFieldValue(text, "Hello There");

    expect(text.getFieldValue("TEXT")).toBe("Hello There");
  });

  it("takes the words a person uses for a comparison", () => {
    const compare = workspace.newBlock("logic_compare");

    const change = setFieldValue(compare, "not equals");

    expect(change.ok).toBe(true);
    expect(compare.getFieldValue("OP")).toBe("NEQ");
  });

  it("takes the stored value too, in case that is what arrives", () => {
    const compare = workspace.newBlock("logic_compare");

    setFieldValue(compare, "GTE");

    expect(compare.getFieldValue("OP")).toBe("GTE");
  });

  it("offers the choices when a comparison is not one of them", () => {
    const compare = workspace.newBlock("logic_compare");

    const change = setFieldValue(compare, "bigger than maybe");

    expect(change.ok).toBe(false);
    expect(change.spoken).toContain("equals");
    expect(compare.getFieldValue("OP")).toBe("EQ");
  });

  it("refuses a number it cannot read", () => {
    const loop = workspace.newBlock("controls_repeat");

    const change = setFieldValue(loop, "lots");

    expect(change.ok).toBe(false);
    expect(change.spoken).toContain("not a number");
  });

  it("leaves a number alone when the value is empty", () => {
    const loop = workspace.newBlock("controls_repeat");
    const before = loop.getFieldValue("TIMES");

    const change = setFieldValue(loop, "   ");

    expect(change.ok).toBe(false);
    expect(loop.getFieldValue("TIMES")).toBe(before);
  });

  it("says so when the block holds no value at all", () => {
    const change = setFieldValue(workspace.newBlock("text_print"), "4");

    expect(change.ok).toBe(false);
    expect(change.spoken).toBe("That block has no value to change.");
  });
});
