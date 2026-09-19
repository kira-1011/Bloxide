import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlocklyWorkspace from "@/blockly/blockly-workspace";
import { WORKSPACE_OPTIONS } from "@/blockly/options";

const inject = vi.fn();

vi.mock(import("blockly/core"), () => ({
  inject: (...args: unknown[]) => inject(...args),
  svgResize: vi.fn(),
}));
vi.mock(import("blockly/blocks"), () => ({}));
// Mocked like locale and storage: the icon subclass needs a real Blockly.
vi.mock(import("@/blockly/block-view"), () => ({
  numberBlocks: vi.fn(),
  findBlockByNumber: vi.fn(),
  getBlockNumber: vi.fn(),
}));
vi.mock(import("@/blockly/locale"), () => ({ initBlocklyLocale: vi.fn() }));

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
  it("injects into the canvas between the controls and the output", () => {
    render(<BlocklyWorkspace />);

    const [element, options] = inject.mock.calls[0] as [HTMLElement, unknown];
    expect(options).toBe(WORKSPACE_OPTIONS);
    // The canvas takes the leftover height; controls and output bracket it.
    expect(element).toHaveClass("flex-1");
  });

  it("offers run and stop controls", () => {
    render(<BlocklyWorkspace />);

    expect(screen.getByRole("button", { name: "Run program" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop program" })).toBeDisabled();
  });

  it("passes the shared options object, so a render never re-injects", () => {
    const { rerender } = render(<BlocklyWorkspace />);

    rerender(<BlocklyWorkspace />);

    expect(inject).toHaveBeenCalledTimes(1);
  });
});
