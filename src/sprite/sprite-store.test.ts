import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SPRITE, STAGE_WIDTH } from "@/sprite/sprite-state";
import {
  changeSize,
  getSpriteState,
  goTo,
  moveSteps,
  resetSprite,
  setSaying,
  setVisible,
  subscribeToSprite,
  turnDegrees,
} from "@/sprite/sprite-store";

// The store is a module singleton, shared across every test in the file.
beforeEach(() => {
  resetSprite();
});

describe("sprite store", () => {
  it("moves along the heading it is facing", () => {
    moveSteps(50);

    expect(getSpriteState().x).toBeCloseTo(50);
    expect(getSpriteState().y).toBeCloseTo(0);
  });

  it("turns right on a positive number and left on a negative one", () => {
    turnDegrees(90);
    expect(getSpriteState().direction).toBe(180);

    turnDegrees(-90);
    expect(getSpriteState().direction).toBe(90);
  });

  it("moves where it is pointed after turning", () => {
    // Facing right to begin with, so a quarter turn left points straight up.
    turnDegrees(-90);
    moveSteps(30);

    expect(getSpriteState().x).toBeCloseTo(0);
    expect(getSpriteState().y).toBeCloseTo(30);
  });

  it("stops at the edge rather than leaving the stage", () => {
    moveSteps(10_000);

    expect(getSpriteState().x).toBeCloseTo(STAGE_WIDTH / 2);
  });

  it("clamps a size that would make the sprite unfindable", () => {
    changeSize(-1000);

    expect(getSpriteState().size).toBe(25);
  });

  it("ignores a value that is not a real number", () => {
    goTo(40, 40);
    moveSteps(Number.NaN);
    goTo(Number.POSITIVE_INFINITY, 0);
    turnDegrees(Number.NaN);

    expect(getSpriteState().x).toBe(40);
    expect(getSpriteState().y).toBe(40);
    expect(getSpriteState().direction).toBe(90);
  });

  it("treats saying nothing as not saying anything", () => {
    setSaying("hello");
    expect(getSpriteState().saying).toBe("hello");

    setSaying("");
    expect(getSpriteState().saying).toBeNull();
  });

  it("puts everything back on reset", () => {
    moveSteps(40);
    turnDegrees(45);
    changeSize(50);
    setVisible(false);
    setSaying("hi");

    resetSprite();

    expect(getSpriteState()).toEqual(DEFAULT_SPRITE);
  });

  it("tells subscribers only when something changed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSprite(listener);

    moveSteps(10);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    moveSteps(10);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hands back the same state until something changes it", () => {
    // useSyncExternalStore re-renders forever on a fresh object each read.
    expect(getSpriteState()).toBe(getSpriteState());

    const before = getSpriteState();
    moveSteps(10);
    expect(getSpriteState()).not.toBe(before);
  });
});
