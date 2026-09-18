import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setLocale = vi.fn();

vi.mock(import("blockly/core"), () => ({ setLocale: (...args: unknown[]) => setLocale(...args) }));
vi.mock(import("blockly/msg/en"), () => ({ VARIABLES_DEFAULT_NAME: "item" }));

beforeEach(() => {
  vi.resetModules();
  setLocale.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ensureBlocklyLocale", () => {
  it("installs the messages blockly/core ships without", async () => {
    const { ensureBlocklyLocale } = await import("@/blockly/locale");

    ensureBlocklyLocale();

    expect(setLocale).toHaveBeenCalledTimes(1);
    expect(setLocale).toHaveBeenCalledWith(
      expect.objectContaining({ VARIABLES_DEFAULT_NAME: "item" }),
    );
  });

  it("is idempotent, so a remounting editor installs once", async () => {
    const { ensureBlocklyLocale } = await import("@/blockly/locale");

    ensureBlocklyLocale();
    ensureBlocklyLocale();
    ensureBlocklyLocale();

    expect(setLocale).toHaveBeenCalledTimes(1);
  });
});
