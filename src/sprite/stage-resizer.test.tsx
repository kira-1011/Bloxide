import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { StageResizer } from "@/sprite/stage-resizer";
import {
  getStageWidth,
  resetStageWidth,
  STAGE_DEFAULT_WIDTH,
  STAGE_MAX_WIDTH,
  STAGE_STEP,
} from "@/sprite/stage-size";

beforeEach(() => {
  resetStageWidth();
});

const handle = () => screen.getByRole("separator", { name: "Resize the stage" });

describe("StageResizer", () => {
  it("widens the stage with the left arrow, since the stage sits on the right", () => {
    render(<StageResizer />);

    fireEvent.keyDown(handle(), { key: "ArrowLeft" });

    expect(getStageWidth()).toBe(STAGE_DEFAULT_WIDTH + STAGE_STEP);
    expect(handle()).toHaveAttribute("aria-valuenow", String(STAGE_DEFAULT_WIDTH + STAGE_STEP));
  });

  it("jumps to the largest size with End", () => {
    render(<StageResizer />);

    fireEvent.keyDown(handle(), { key: "End" });

    expect(getStageWidth()).toBe(STAGE_MAX_WIDTH);
  });

  it("can be reached by keyboard, not only dragged", () => {
    render(<StageResizer />);

    expect(handle()).toHaveAttribute("tabindex", "0");
  });
});
