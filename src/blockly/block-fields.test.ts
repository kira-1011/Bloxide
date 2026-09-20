import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/sprite-blocks";
import { beforeEach, describe, expect, it } from "vitest";
import { editableField, setFieldValue, valueSlots } from "@/blockly/block-fields";
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
    expect(editableField(workspace.newBlock("bloxide_say"))).toBeNull();
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

/** A block with its slots filled, the way the toolbox and addBlock make one. */
function withShadows(
  type: string,
  inputs: Record<string, Blockly.serialization.blocks.ConnectionState>,
): Blockly.Block {
  return Blockly.serialization.blocks.append({ type, inputs }, workspace);
}

function numberSlot(value: number): Blockly.serialization.blocks.ConnectionState {
  return { shadow: { type: "math_number", fields: { NUM: value } } };
}

function textSlot(value: string): Blockly.serialization.blocks.ConnectionState {
  return { shadow: { type: "text", fields: { TEXT: value } } };
}

describe("valueSlots", () => {
  it("names a shadow's value after the input it sits in", () => {
    const goTo = withShadows("bloxide_go_to", { X: numberSlot(0), Y: numberSlot(0) });

    expect(valueSlots(goTo).map((slot) => slot.name)).toEqual(["x", "y"]);
  });

  // Every block we ship keeps its values in slots, so the cases below reach
  // for Blockly's own inline-field blocks: setFieldValue still has to handle
  // one, and a field is where a shadow keeps its value anyway.
  it("names a block's own field after the field", () => {
    expect(valueSlots(workspace.newBlock("controls_repeat")).map((slot) => slot.name)).toEqual([
      "times",
    ]);
  });

  it("finds nothing in an empty input, because a hole holds no value", () => {
    expect(valueSlots(workspace.newBlock("bloxide_go_to"))).toHaveLength(0);
  });
});

describe("setFieldValue", () => {
  it("writes into the slot it is given", () => {
    const goTo = withShadows("bloxide_go_to", { X: numberSlot(0), Y: numberSlot(0) });

    const change = setFieldValue(goTo, "30", "y");

    expect(change.ok).toBe(true);
    expect(goTo.getInputTargetBlock("Y")?.getFieldValue("NUM")).toBe(30);
    expect(goTo.getInputTargetBlock("X")?.getFieldValue("NUM")).toBe(0);
  });

  it("asks which one rather than guessing, when a block holds two", () => {
    const goTo = withShadows("bloxide_go_to", { X: numberSlot(0), Y: numberSlot(0) });

    const change = setFieldValue(goTo, "30");

    expect(change.ok).toBe(false);
    expect(change.spoken).toBe("Say which one: x or y.");
    expect(goTo.getInputTargetBlock("X")?.getFieldValue("NUM")).toBe(0);
  });

  it("asks again when the slot named is not one of them", () => {
    const sayFor = withShadows("bloxide_say_for", {
      TEXT: textSlot("Hello!"),
      SECONDS: numberSlot(2),
    });

    expect(setFieldValue(sayFor, "3", "how long").spoken).toBe("Say which one: text or seconds.");
  });

  it("needs no slot when the block holds only one value", () => {
    const move = withShadows("bloxide_move", { STEPS: numberSlot(10) });

    const change = setFieldValue(move, "50");

    expect(change.ok).toBe(true);
    expect(move.getInputTargetBlock("STEPS")?.getFieldValue("NUM")).toBe(50);
  });

  it("still clamps and rounds inside a shadow, and says what landed", () => {
    const wait = withShadows("bloxide_wait", { SECONDS: numberSlot(1) });

    const change = setFieldValue(wait, "lots");

    expect(change.ok).toBe(false);
    expect(change.spoken).toContain("not a number");
  });

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
    const change = setFieldValue(workspace.newBlock("bloxide_hide"), "4");

    expect(change.ok).toBe(false);
    expect(change.spoken).toBe("That block has no value to change.");
  });
});
