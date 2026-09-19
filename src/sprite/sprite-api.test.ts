import { beforeEach, describe, expect, it } from "vitest";
import { ProgramStopped } from "@/run/program-stopped";
import { createSpriteApi, type RunSession } from "@/sprite/sprite-api";
import { getSpriteState, resetSprite } from "@/sprite/sprite-store";

/**
 * A stand-in for what the runner lends a program, with the two levers the
 * runner pulls: stop, and hand the run to someone else.
 */
function session(): RunSession & { stop: () => void } {
  let stopped = false;
  const aborts = new Set<(reason: unknown) => void>();

  return {
    stop() {
      stopped = true;
      const waiting = [...aborts];
      aborts.clear();
      for (const abort of waiting) abort(new ProgramStopped());
    },
    guard() {
      if (stopped) throw new ProgramStopped();
    },
    sleep(ms) {
      return new Promise<void>((resolve, reject) => {
        if (stopped) {
          reject(new ProgramStopped());
          return;
        }
        const abort = (reason: unknown): void => {
          clearTimeout(timer);
          reject(reason);
        };
        const timer = setTimeout(() => {
          aborts.delete(abort);
          resolve();
        }, ms);
        aborts.add(abort);
      });
    },
  };
}

beforeEach(() => {
  resetSprite();
});

describe("createSpriteApi", () => {
  it("moves the sprite the way the block reads", async () => {
    const sprite = createSpriteApi(session());

    await sprite.move(50);

    expect(getSpriteState().x).toBeCloseTo(50);
  });

  it("turns right on a positive number", async () => {
    const sprite = createSpriteApi(session());

    await sprite.turn(90);

    expect(getSpriteState().direction).toBe(180);
  });

  it("clears the bubble after saying something for a time", async () => {
    const sprite = createSpriteApi(session());

    await sprite.sayFor("hello", 0);

    expect(getSpriteState().saying).toBeNull();
  });

  it("leaves the bubble up when say has no time on it", async () => {
    const sprite = createSpriteApi(session());

    await sprite.say("hello");

    expect(getSpriteState().saying).toBe("hello");
  });

  it("refuses to move once the run is stopped", async () => {
    const run = session();
    const sprite = createSpriteApi(run);

    run.stop();

    await expect(sprite.move(50)).rejects.toBeInstanceOf(ProgramStopped);
    expect(getSpriteState().x).toBe(0);
  });

  it("cuts a long wait short rather than outliving the run", async () => {
    const run = session();
    const sprite = createSpriteApi(run);

    // A bare setTimeout would still resolve a minute later and run one more
    // statement; Stop has to land now, not when the timer was due.
    const waiting = sprite.wait(60);
    run.stop();

    await expect(waiting).rejects.toBeInstanceOf(ProgramStopped);
  });

  it("leaves the bubble alone when a stop interrupts say for", async () => {
    const run = session();
    const sprite = createSpriteApi(run);

    const saying = sprite.sayFor("hello", 60);
    run.stop();

    await expect(saying).rejects.toBeInstanceOf(ProgramStopped);
    // The runner clears it, so this must not: two owners would race.
    expect(getSpriteState().saying).toBe("hello");
  });

  it("stops partway through a run of commands", async () => {
    const run = session();
    const sprite = createSpriteApi(run);

    await sprite.move(10);
    run.stop();
    await expect(sprite.move(10)).rejects.toBeInstanceOf(ProgramStopped);

    expect(getSpriteState().x).toBeCloseTo(10);
  });
});
