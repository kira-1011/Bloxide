import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlocklyWorkspace from "@/blockly/blockly-workspace";
import { WORKSPACE_OPTIONS } from "@/blockly/options";

const inject = vi.fn();

// Partial, so the real core still defines blocks and themes while injection is
// faked. Blockly is CJS, so its named exports hang off `default` rather than
// spreading out of the namespace — hence the second spread.
vi.mock(import("blockly/core"), async (importOriginal) => {
  const actual = await importOriginal();
  const named: Record<string, unknown> = { ...actual, ...Reflect.get(actual, "default") };
  return { ...named, inject: (...args: unknown[]) => inject(...args), svgResize: vi.fn() };
});
// Neither `blockly/blocks` nor the locale is mocked here any more: the palette
// reads its silhouettes off blocks Blockly builds, so its definitions and
// messages both have to be real by the time this tree renders.
// Mocked like storage: the icon subclass needs a real Blockly.
vi.mock(import("@/blockly/block-view"), () => ({
  numberBlocks: vi.fn(),
  findBlockByNumber: vi.fn(),
  getBlockNumber: vi.fn(),
}));

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
  it("injects into the canvas between the palette and the stage", () => {
    render(<BlocklyWorkspace />);

    const [element, options] = inject.mock.calls[0] as [HTMLElement, unknown];
    expect(options).toBe(WORKSPACE_OPTIONS);
    // The canvas's frame takes the leftover width, beside its own controls;
    // the palette sits before it, the resizer and stage after.
    const frame = element.parentElement;
    expect(frame).toHaveClass("grow");
    expect(frame).toContainElement(screen.getByRole("button", { name: "Zoom in" }));
    expect(frame?.previousElementSibling).toHaveTextContent("MOVEMENT");
    expect(frame?.nextElementSibling).toHaveAttribute("role", "separator");
    expect(frame?.nextElementSibling?.nextElementSibling).toContainElement(screen.getByRole("img"));
  });

  it("offers run and stop from the voice bar", () => {
    render(<BlocklyWorkspace />);

    expect(screen.getByRole("button", { name: "Run program" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop program" })).toBeDisabled();
  });

  it("lays the editor out in four zones", () => {
    render(<BlocklyWorkspace />);

    expect(screen.getByRole("banner")).toHaveTextContent("Bloxide");
    expect(screen.getByRole("heading", { name: "MOVEMENT" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/^Sprite at/);
    expect(screen.getByRole("button", { name: "Run program" })).toBeInTheDocument();
  });

  it("passes the shared options object, so a render never re-injects", () => {
    const { rerender } = render(<BlocklyWorkspace />);

    rerender(<BlocklyWorkspace />);

    expect(inject).toHaveBeenCalledTimes(1);
  });
});
