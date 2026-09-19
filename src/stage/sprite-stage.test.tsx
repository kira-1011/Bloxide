import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpriteStage } from "@/stage/sprite-stage";

describe("SpriteStage", () => {
  it("draws the sprite with a name a screen reader can announce", () => {
    render(<SpriteStage />);

    expect(screen.getByLabelText("Your sprite")).toBeInTheDocument();
  });

  it("speaks in a bubble on the stage, not in a panel elsewhere", () => {
    render(<SpriteStage saying="Hello!" />);

    expect(screen.getByText("Hello!")).toBeInTheDocument();
  });

  it("shows no bubble while the sprite is silent", () => {
    const { container } = render(<SpriteStage />);

    expect(container.querySelector("p")).toBeNull();
  });
});
