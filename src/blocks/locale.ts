import * as Blockly from "blockly/core";
import * as en from "blockly/msg/en";

/**
 * `blockly/core` ships no messages of its own, so every `Blockly.Msg.*` lookup
 * is undefined until a locale is installed — including the aria labels read
 * during `inject`, which throws without this.
 *
 * Called from the entry module, before the first render. This is also the i18n
 * hook: am and om swap in here.
 */
export function installBlocklyLocale(): void {
  Blockly.setLocale(en as unknown as Record<string, string>);
}
