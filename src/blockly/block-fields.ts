import * as Blockly from "blockly/core";

// The value written on a block: finding the one field that holds it, turning a
// spoken word into something the field accepts, and reporting what landed.

/** One value a block holds, under the word someone would use for it. */
export interface ValueSlot {
  /** Spoken: an input or field name, lowercased. */
  readonly name: string;
  readonly field: Blockly.Field;
}

export interface FieldChange {
  readonly ok: boolean;
  /** What to say back — the value the field settled on, or why it did not. */
  readonly spoken: string;
}

/** Case and stray spacing only: what a word means is the agent's to work out. */
function normalise(value: string): string {
  return value.trim().toLowerCase();
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

/**
 * A block's own fields plus the one field of each shadow in a value input,
 * since that is where values live now. Inputs name the slot, so "x" is sayable.
 */
export function valueSlots(block: Blockly.Block): readonly ValueSlot[] {
  const own = block.inputList.flatMap((input) =>
    input.fieldRow
      .filter((field) => field.EDITABLE)
      .map((field) => ({ name: (field.name ?? "").toLowerCase(), field })),
  );

  const shadows = block.inputList.flatMap((input) => {
    const child = input.connection?.targetBlock();
    if (!child?.isShadow()) return [];
    const field = editableField(child);
    return field ? [{ name: input.name.toLowerCase(), field }] : [];
  });

  return [...own, ...shadows];
}

/** "x or y", "text, seconds or times" — a list someone can answer out loud. */
function nameList(slots: readonly ValueSlot[]): string {
  const names = slots.map((slot) => slot.name);
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
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
export function setFieldValue(block: Blockly.Block, spoken: string, slot?: string): FieldChange {
  const slots = valueSlots(block);
  if (slots.length === 0) return { ok: false, spoken: "That block has no value to change." };

  if (slot !== undefined) {
    const wanted = normalise(slot);
    const named = slots.find((candidate) => candidate.name === wanted);
    if (!named) return { ok: false, spoken: `Say which one: ${nameList(slots)}.` };
    return writeField(block, named.field, spoken);
  }

  // Asking beats guessing: with two slots either answer is wrong half the time,
  // and "which one" is a question a child can answer in one word.
  if (slots.length > 1) return { ok: false, spoken: `Say which one: ${nameList(slots)}.` };

  const only = slots[0];
  if (!only) return { ok: false, spoken: "That block has no value to change." };
  return writeField(block, only.field, spoken);
}

function writeField(block: Blockly.Block, field: Blockly.Field, spoken: string): FieldChange {
  // The field knows which block it is on; a shadow's field is not on `block`.
  const owner = field.getSourceBlock() ?? block;

  if (field instanceof Blockly.FieldDropdown) {
    const value = dropdownValue(field, spoken);
    if (!value) {
      return { ok: false, spoken: `It can be ${dropdownWords(field).join(", ")}.` };
    }
    owner.setFieldValue(value, field.name ?? "");
    return { ok: true, spoken: `Changed it to ${spoken}` };
  }

  if (field instanceof Blockly.FieldNumber) {
    // Number("") is 0, so an empty value would silently set the field to zero.
    const normalised = normalise(spoken);
    if (!normalised) return { ok: false, spoken: "That is not a number." };
    const asNumber = Number(normalised);
    if (!Number.isFinite(asNumber)) return { ok: false, spoken: `${spoken} is not a number.` };
    owner.setFieldValue(asNumber, field.name ?? "");
    return { ok: true, spoken: `Set it to ${owner.getFieldValue(field.name ?? "")}` };
  }

  owner.setFieldValue(spoken, field.name ?? "");
  return { ok: true, spoken: `Set it to ${owner.getFieldValue(field.name ?? "")}` };
}
