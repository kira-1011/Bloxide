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
  Blockly.setLocale(en as unknown as Record<string, string>);
}
