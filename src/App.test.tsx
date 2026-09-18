import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "@/App";

// Never resolves: holds the editor chunk in flight so the fallback stays up.
vi.mock(import("@/blockly/BlocklyWorkspace"), () => new Promise<never>(() => {}));

describe("App", () => {
  it("paints a shell while the editor chunk loads", () => {
    render(<App />);

    // Blockly is ~900 kB; the child should not stare at a blank page for it.
    expect(screen.getByText("Loading blocks…")).toBeInTheDocument();
  });
});
