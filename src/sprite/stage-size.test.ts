import { beforeEach, describe, expect, it } from "vitest";
import {
  getStageWidth,
  growStage,
  resetStageWidth,
  setStageWidth,
  STAGE_DEFAULT_WIDTH,
  STAGE_MAX_WIDTH,
  STAGE_MIN_WIDTH,
  STAGE_STEP,
} from "@/sprite/stage-size";

beforeEach(() => {
  resetStageWidth();
});

describe("stage size", () => {
  it("grows and shrinks by whole steps", () => {
    expect(growStage(1)).toBe(true);
    expect(getStageWidth()).toBe(STAGE_DEFAULT_WIDTH + STAGE_STEP);

    growStage(-2);
    expect(getStageWidth()).toBe(STAGE_DEFAULT_WIDTH - STAGE_STEP);
  });

  it("stays between its limits, however far it is pushed", () => {
    setStageWidth(10_000);
    expect(getStageWidth()).toBe(STAGE_MAX_WIDTH);

    setStageWidth(-5);
    expect(getStageWidth()).toBe(STAGE_MIN_WIDTH);
  });

  it("reports when it is already at the limit", () => {
    setStageWidth(STAGE_MAX_WIDTH);

    expect(growStage(1)).toBe(false);
  });

  it("ignores a width that is not a number", () => {
    setStageWidth(Number.NaN);

    expect(getStageWidth()).toBe(STAGE_DEFAULT_WIDTH);
  });
});
