import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlocklyWorkspace from "@/blockly/BlocklyWorkspace";
import { WORKSPACE_OPTIONS } from "@/blockly/options";

const inject = vi.fn();

vi.mock(import("blockly/core"), () => ({
  inject: (...args: unknown[]) => inject(...args),
  svgResize: vi.fn(),
}));
vi.mock(import("blockly/blocks"), () => ({}));
vi.mock(import("@/blockly/locale"), () => ({ ensureBlocklyLocale: vi.fn() }));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    },
  );
  inject.mockReturnValue({
    dispose: vi.fn(),
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("BlocklyWorkspace", () => {
  it("injects into a container that fills its parent", () => {
    const { container } = render(<BlocklyWorkspace />);

    const mount = container.firstElementChild;
    expect(mount).toHaveClass("h-full", "w-full");
    expect(inject).toHaveBeenCalledWith(mount, WORKSPACE_OPTIONS);
  });

  it("passes the shared options object, so a render never re-injects", () => {
    const { rerender } = render(<BlocklyWorkspace />);

    rerender(<BlocklyWorkspace />);

    expect(inject).toHaveBeenCalledTimes(1);
  });
});
