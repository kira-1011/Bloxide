import {
  changeSize,
  goTo,
  moveSteps,
  setSaying,
  setVisible,
  turnDegrees,
} from "@/sprite/sprite-store";

// The sprite as a running program sees it. The store says what the sprite is;
// this says what a program may do to it, and when that is allowed to happen.

/**
 * What the runner lends a program: a way to ask whether it is still the one
 * running, and a wait that a Stop can cut short.
 */
export interface RunSession {
  /** Throws if this run was stopped or replaced. */
  guard(): void;
  /** Resolves after `ms`, or rejects the moment the run is stopped. */
  sleep(ms: number): Promise<void>;
}

export interface SpriteApi {
  move(steps: number): Promise<void>;
  /** Positive turns right, the way the block reads. */
  turn(degrees: number): Promise<void>;
  goTo(x: number, y: number): Promise<void>;
  say(text: unknown): Promise<void>;
  sayFor(text: unknown, seconds: number): Promise<void>;
  changeSize(percent: number): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
  wait(seconds: number): Promise<void>;
}

function milliseconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, seconds) * 1000 : 0;
}

export function createSpriteApi(session: RunSession): SpriteApi {
  /**
   * Guard, change, then yield.
   *
   * Guarding first is what keeps a replaced run from moving the sprite out from
   * under the one that replaced it. The yield afterwards is what lets the
   * screen catch up: the commands are instant, but a stack of them with nothing
   * between would paint once at the end and read as the sprite teleporting.
   */
  const step = async (change: () => void): Promise<void> => {
    session.guard();
    change();
    await session.sleep(0);
  };

  return {
    move: (steps) => step(() => moveSteps(steps)),
    turn: (degrees) => step(() => turnDegrees(degrees)),
    goTo: (x, y) => step(() => goTo(x, y)),
    say: (text) => step(() => setSaying(String(text))),
    changeSize: (percent) => step(() => changeSize(percent)),
    setVisible: (visible) => step(() => setVisible(visible)),

    async sayFor(text, seconds) {
      session.guard();
      setSaying(String(text));
      await session.sleep(milliseconds(seconds));
      // Throws before clearing, so a stopped run leaves the bubble for the
      // runner to clear — one owner for it, not two racing.
      session.guard();
      setSaying(null);
    },

    async wait(seconds) {
      session.guard();
      await session.sleep(milliseconds(seconds));
      session.guard();
    },
  };
}
