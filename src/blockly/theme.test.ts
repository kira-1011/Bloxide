import { describe, expect, it } from "vitest";
import { BLOXIDE_THEME } from "@/blockly/theme";
import { WORKSPACE_OPTIONS } from "@/blockly/options";

describe("BLOXIDE_THEME", () => {
  it("gives each DESIGN.md category its one fill", () => {
    expect(BLOXIDE_THEME.blockStyles["movement_blocks"]?.colourPrimary).toBe("#1D4ED8");
    expect(BLOXIDE_THEME.blockStyles["say_blocks"]?.colourPrimary).toBe("#A21CAF");
    expect(BLOXIDE_THEME.blockStyles["look_blocks"]?.colourPrimary).toBe("#0E7490");
    expect(BLOXIDE_THEME.blockStyles["control_blocks"]?.colourPrimary).toBe("#C2410C");
  });

  it("paints the borrowed repeat as a control block", () => {
    expect(BLOXIDE_THEME.blockStyles["loop_blocks"]?.colourPrimary).toBe(
      BLOXIDE_THEME.blockStyles["control_blocks"]?.colourPrimary,
    );
  });

  it("sets block text to DESIGN.md's 27px, in the points Blockly wants", () => {
    expect(BLOXIDE_THEME.fontStyle.size).toBeCloseTo(20.25);
    expect(BLOXIDE_THEME.fontStyle.family).toContain("Baloo 2");
  });

  it("draws no hat, which would name a mouse", () => {
    expect(BLOXIDE_THEME.startHats).toBe(false);
  });

  it("is what the workspace is injected with", () => {
    expect(WORKSPACE_OPTIONS.theme).toBe(BLOXIDE_THEME);
  });
});
