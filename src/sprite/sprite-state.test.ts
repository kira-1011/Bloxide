import { describe, expect, it } from "vitest";
import {
  clampPosition,
  clampSize,
  describeSprite,
  DEFAULT_SPRITE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  stepDelta,
  wrapDirection,
} from "@/sprite/sprite-state";

const round = (value: number) => Math.round(value * 1000) / 1000;

describe("stepDelta", () => {
  it("carries a heading the way Scratch reads it", () => {
    // 90 right, 0 up, clockwise — and y is stored pointing up.
    expect(round(stepDelta(90, 10).dx)).toBe(10);
    expect(round(stepDelta(90, 10).dy)).toBe(0);
    expect(round(stepDelta(0, 10).dy)).toBe(10);
    expect(round(stepDelta(180, 10).dy)).toBe(-10);
    expect(round(stepDelta(-90, 10).dx)).toBe(-10);
  });

  it("goes backwards on negative steps", () => {
    expect(round(stepDelta(90, -10).dx)).toBe(-10);
  });
});

describe("wrapDirection", () => {
  it("keeps a heading in the range a person would say", () => {
    expect(wrapDirection(90)).toBe(90);
    expect(wrapDirection(270)).toBe(-90);
    expect(wrapDirection(-270)).toBe(90);
    expect(wrapDirection(450)).toBe(90);
  });

  it("says 180 rather than -180 for straight down", () => {
    expect(wrapDirection(180)).toBe(180);
    expect(wrapDirection(-180)).toBe(180);
  });
});

describe("clampPosition", () => {
  it("keeps the sprite's centre on the stage", () => {
    expect(clampPosition(9999, 9999)).toEqual({ x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 });
    expect(clampPosition(-9999, -9999)).toEqual({ x: -STAGE_WIDTH / 2, y: -STAGE_HEIGHT / 2 });
  });

  it("leaves a position on the stage alone", () => {
    expect(clampPosition(40, -20)).toEqual({ x: 40, y: -20 });
  });
});

describe("clampSize", () => {
  it("will not shrink the sprite to a dot or grow it past the stage", () => {
    expect(clampSize(0)).toBe(25);
    expect(clampSize(-100)).toBe(25);
    expect(clampSize(10000)).toBe(400);
    expect(clampSize(150)).toBe(150);
  });
});

describe("describeSprite", () => {
  it("reads out where the sprite is", () => {
    expect(describeSprite(DEFAULT_SPRITE)).toBe("Sprite at x 0, y 0, facing 90 degrees");
  });

  it("says when it is hidden or speaking", () => {
    expect(describeSprite({ ...DEFAULT_SPRITE, visible: false })).toContain("hidden");
    expect(describeSprite({ ...DEFAULT_SPRITE, saying: "hello" })).toContain("saying hello");
  });
});
