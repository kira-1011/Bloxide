import * as Blockly from "blockly/core";

// The value written on a block: finding the one field that holds it, turning a
// spoken word into something the field accepts, and reporting what landed.

export interface FieldChange {
  readonly ok: boolean;
  /** What to say back — the value the field settled on, or why it did not. */
  readonly spoken: string;
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * The single editable field on a block, or null.
 *
 * Every block we ship has one or none, which is why no capability names a
 * field. A test holds that invariant, so a block with two fails loudly rather
 * than having one picked for it.
 */
export function editableField(block: Blockly.Block): Blockly.Field | null {
  const fields = block.inputList.flatMap((input) =>
    input.fieldRow.filter((field) => field.EDITABLE),
  );
  return fields.length === 1 ? (fields[0] ?? null) : null;
}

/** A dropdown's options include separators, which carry no value to pick. */
type ChoosableOption = Exclude<Blockly.MenuOption, "separator">;

function isChoosable(option: Blockly.MenuOption): option is ChoosableOption {
  return option !== "separator";
}

function choices(field: Blockly.FieldDropdown): ChoosableOption[] {
  return field.getOptions(false).filter(isChoosable);
}

/**
 * Matches what was said against a dropdown's own options.
 *
 * Blockly carries an accessible label beside each option — "equals" for "EQ" —
 * so the words a person uses are already there to match against.
 */
function dropdownValue(field: Blockly.FieldDropdown, spoken: string): string | null {
  const wanted = normalise(spoken);

  for (const [label, value, spokenLabel] of choices(field)) {
    if (normalise(value) === wanted) return value;
    if (spokenLabel && normalise(spokenLabel) === wanted) return value;
    if (typeof label === "string" && normalise(label) === wanted) return value;
  }

  return null;
}

/** The words a person would use for a dropdown, for saying the choices back. */
function dropdownWords(field: Blockly.FieldDropdown): string[] {
  return choices(field).map(
    ([label, value, spokenLabel]) => spokenLabel ?? (typeof label === "string" ? label : value),
  );
}

/**
 * Writes a value onto a block, and reads back what the field made of it.
 *
 * Blockly's validators clamp and round, so what was asked for is not always
 * what landed; saying the stored value back is the only honest confirmation.
 */
export function setFieldValue(block: Blockly.Block, spoken: string): FieldChange {
  const field = editableField(block);
  if (!field) return { ok: false, spoken: "That block has no value to change." };

  if (field instanceof Blockly.FieldDropdown) {
    const value = dropdownValue(field, spoken);
    if (!value) {
      return { ok: false, spoken: `It can be ${dropdownWords(field).join(", ")}.` };
    }
    block.setFieldValue(value, field.name ?? "");
    return { ok: true, spoken: `Changed it to ${spoken}` };
  }

  if (field instanceof Blockly.FieldNumber) {
    // Number("") is 0, so an empty value would silently set the field to zero.
    const normalised = normalise(spoken);
    if (!normalised) return { ok: false, spoken: "That is not a number." };
    const asNumber = Number(normalised);
    if (!Number.isFinite(asNumber)) return { ok: false, spoken: `${spoken} is not a number.` };
    block.setFieldValue(asNumber, field.name ?? "");
    return { ok: true, spoken: `Set it to ${block.getFieldValue(field.name ?? "")}` };
  }

  block.setFieldValue(spoken, field.name ?? "");
  return { ok: true, spoken: `Set it to ${block.getFieldValue(field.name ?? "")}` };
}
