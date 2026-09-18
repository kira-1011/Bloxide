import * as Blockly from "blockly/core";
import * as en from "blockly/msg/en";

let installed = false;

/**
 * `blockly/core` ships no messages, so every `Blockly.Msg.*` lookup is
 * undefined until a locale is installed — including the aria labels read during
 * `inject`, which throws without this.
 *
 * Idempotent, and called from behind the editor seam rather than the entry
 * module, so the app shell never pulls Blockly into its bundle. This is also
 * the i18n hook: am and om swap in here.
 */
export function ensureBlocklyLocale(): void {
  if (installed) return;
  installed = true;
  Blockly.setLocale(en as unknown as Record<string, string>);
}
