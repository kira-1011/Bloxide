import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/custom-blocks";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { initBlocklyLocale } from "@/blockly/locale";
import { BlockPalette } from "@/palette/block-palette";
import { PALETTE_BLOCKS, type PaletteBlock } from "@/palette/catalogue";
import { isPaletteOpen, setPaletteOpen } from "@/palette/palette-store";
import { BLOCK_TYPES } from "@/blockly/toolbox";

initBlocklyLocale();

beforeEach(() => {
  // jsdom has no layout, so nothing implements it.
  Element.prototype.scrollIntoView = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
});

afterEach(() => {
  setActiveWorkspace(null);
  setPaletteOpen(true);
});

const rail = (label: string) =>
  screen.getByRole("button", { name: `Scroll to the ${label} blocks` });

describe("BlockPalette", () => {
  it("shows every block at once, so the child recognises rather than recalls", () => {
    render(<BlockPalette />);

    expect(screen.getByText("move")).toBeInTheDocument();
    expect(screen.getByText("forever")).toBeInTheDocument();
    expect(screen.getAllByRole("heading")).toHaveLength(4);
  });

  it("keeps every block visible after jumping to a category", () => {
    render(<BlockPalette />);

    fireEvent.click(rail("Control"));

    // The jump scrolls. It must never hide the blocks it scrolled away from.
    expect(screen.getByText("move")).toBeInTheDocument();
    expect(screen.getByText("forever")).toBeInTheDocument();
  });

  it("scrolls to the heading of the category asked for", () => {
    render(<BlockPalette />);

    fireEvent.click(rail("Say"));

    const scrolled = vi.mocked(Element.prototype.scrollIntoView).mock.instances[0];
    expect(scrolled).toHaveTextContent("SAY");
  });

  it("jumps without scrolling motion when the child's system asks for less", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    render(<BlockPalette />);

    fireEvent.click(rail("Say"));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
  });

  it("marks where you are, and only there", () => {
    render(<BlockPalette />);

    fireEvent.click(rail("Look"));

    expect(rail("Look")).toHaveAttribute("aria-current", "true");
    expect(rail("Movement")).not.toHaveAttribute("aria-current");
  });

  it("names each category in words, never by colour alone", () => {
    render(<BlockPalette />);

    for (const label of ["MOVEMENT", "SAY", "LOOK", "CONTROL"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("offers one rail target per category", () => {
    render(<BlockPalette />);

    expect(screen.getAllByRole("button", { name: /^Scroll to the/ })).toHaveLength(4);
  });

  it("places the real block when a row is pressed, and says so", () => {
    const workspace = new Blockly.Workspace();
    // A headless workspace stands in for the rendered one; addBlock only
    // reaches for SVG behind an instanceof check.
    setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
    render(<BlockPalette />);

    fireEvent.click(screen.getByRole("button", { name: /^Add move/ }));

    const placed = workspace.getBlocksByType("bloxide_move", false);
    expect(placed).toHaveLength(1);
    expect(placed[0]?.getInputTargetBlock("STEPS")?.getFieldValue("NUM")).toBe(10);
    expect(screen.getByRole("status")).toHaveTextContent("Added a move block");
  });

  it("does nothing before the workspace has opened", () => {
    render(<BlockPalette />);

    fireEvent.click(screen.getByRole("button", { name: /^Add move/ }));

    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("folds down to the rail for room, and opens again", () => {
    render(<BlockPalette />);

    fireEvent.click(screen.getByRole("button", { name: "Hide the blocks" }));

    expect(isPaletteOpen()).toBe(false);
    expect(screen.queryByRole("button", { name: /^Add move/ })).not.toBeInTheDocument();
    // The categories stay, so the child still sees what there is.
    expect(rail("Control")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show the blocks" }));
    expect(screen.getByRole("button", { name: /^Add move/ })).toBeInTheDocument();
  });

  it("opens a folded palette at the category pressed", () => {
    setPaletteOpen(false);
    render(<BlockPalette />);

    fireEvent.click(rail("Look"));

    expect(isPaletteOpen()).toBe(true);
    const scrolled = vi.mocked(Element.prototype.scrollIntoView).mock.instances[0];
    expect(scrolled).toHaveTextContent("LOOK");
  });

  it("lists exactly the blocks the toolbox offers, so neither can fall behind", () => {
    expect(PALETTE_BLOCKS.map((block) => block.id)).toEqual([...BLOCK_TYPES]);
  });
});

const row = (name: string) => screen.getByRole("button", { name });

const labelOf = (block: PaletteBlock) =>
  `Add ${block.parts.map((part) => ("word" in part ? part.word : part.slot)).join(" ")}`;

describe("BlockPalette shapes", () => {
  it("draws a stack block notched above and tabbed below", () => {
    render(<BlockPalette />);
    const move = row("Add move 10 steps");

    expect(move.querySelector('[data-notch="top"]')).toBeInTheDocument();
    expect(move.querySelector('[data-notch="bottom"]')).toBeInTheDocument();
    expect(move.querySelector("[data-mouth]")).not.toBeInTheDocument();
  });

  it("leaves a cap block with nothing to tab onto", () => {
    render(<BlockPalette />);
    const forever = row("Add forever");

    expect(forever.querySelector('[data-notch="top"]')).toBeInTheDocument();
    expect(forever.querySelector('[data-notch="bottom"]')).not.toBeInTheDocument();
  });

  it("opens a mouth on the blocks that wrap others", () => {
    render(<BlockPalette />);

    expect(row("Add repeat 10 times").querySelector("[data-mouth]")).toBeInTheDocument();
    expect(row("Add forever").querySelector("[data-mouth]")).toBeInTheDocument();
    expect(row("Add wait 1 seconds").querySelector("[data-mouth]")).not.toBeInTheDocument();
  });

  it("sizes every block to its own words rather than to the panel", () => {
    render(<BlockPalette />);

    // jsdom has no layout, so widths cannot be measured here; the section
    // stretches its children by default, and `self-start` is the one thing
    // stopping every block coming out the same bar. The widths themselves are
    // checked in a browser.
    for (const block of PALETTE_BLOCKS) {
      expect(row(labelOf(block))).toHaveClass("self-start");
    }
  });

  it("shapes every block the palette lists, so a new one cannot come out flat", () => {
    render(<BlockPalette />);

    for (const block of PALETTE_BLOCKS) {
      const drawn = row(labelOf(block));
      expect(Boolean(drawn.querySelector('[data-notch="top"]'))).toBe(block.shape.socketTop);
      expect(Boolean(drawn.querySelector('[data-notch="bottom"]'))).toBe(block.shape.tabBottom);
      expect(Boolean(drawn.querySelector("[data-mouth]"))).toBe(block.shape.mouth);
    }
  });

  it("keeps the shape out of what a screen reader reads", () => {
    render(<BlockPalette />);
    const repeat = row("Add repeat 10 times");

    for (const part of repeat.querySelectorAll("[data-notch], [data-mouth]")) {
      expect(part).toHaveAttribute("aria-hidden", "true");
    }
    // The name is the words, not the notches.
    expect(repeat).toHaveAccessibleName("Add repeat 10 times");
  });

  it("stays a native button, so a key reaches it as well as a pointer", () => {
    const workspace = new Blockly.Workspace();
    setActiveWorkspace(workspace as Blockly.WorkspaceSvg);
    render(<BlockPalette />);
    const forever = row("Add forever");

    expect(forever.tagName).toBe("BUTTON");
    expect(forever).not.toHaveAttribute("tabindex");

    forever.focus();
    expect(forever).toHaveFocus();
    // What a browser turns Enter or Space on a focused button into.
    fireEvent.click(document.activeElement ?? forever);

    expect(workspace.getBlocksByType("bloxide_forever", false)).toHaveLength(1);
  });
});
