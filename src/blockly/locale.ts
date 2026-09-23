import * as Blockly from "blockly/core";
import * as en from "blockly/msg/en";

let installed = false;

/**
 * `blockly/core` ships no messages, so `inject` throws reading an aria label
 * until a locale is installed. Idempotent, and called from behind the editor
 * seam so the app shell never pulls Blockly into its bundle.
 */
export function initBlocklyLocale(): void {
  if (installed) return;
  installed = true;
  // The namespace carries a non-string `default` alongside the messages.
  const messages = Object.fromEntries(
    Object.entries(en).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  // "repeat 10 times" already says it all; DESIGN.md draws no "do" under it.
  Blockly.setLocale({ ...messages, CONTROLS_REPEAT_INPUT_DO: "" });
}
