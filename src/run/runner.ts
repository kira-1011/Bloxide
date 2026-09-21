import type * as Blockly from "blockly/core";
import { javascriptGenerator } from "blockly/javascript";
import "@/blocks/sprite-generators";
import { createStore } from "zustand/vanilla";
import { ProgramStopped } from "@/run/program-stopped";
import { createSpriteApi, type RunSession } from "@/sprite/sprite-api";
import { resetSprite, setSaying } from "@/sprite/sprite-store";

export interface RunState {
  readonly running: boolean;
  readonly error: string | null;
}

interface Run {
  cancelled: boolean;
  /**
   * Waiting timers, so Stop lands at once.
   *
   * A bare setTimeout promise outlives a stop: the timer still fires and the
   * program runs one more statement. During a long wait, Stop would look dead.
   */
  readonly aborts: Set<(reason: unknown) => void>;
}

/** Scratch's frame: 30 a second, and a loop yields once each time round. */
const FRAME = 1000 / 30;

// A handle the cancellation guards compare by identity, not reactive state.
let currentRun: Run | null = null;

// The state lives here rather than in React because a program can be started by
// a button or by voice, and both must see the same run.
const store = createStore<RunState>()(() => ({ running: false, error: null }));

export function isProgramRunning(): boolean {
  return currentRun !== null;
}

/** Safe when nothing is running, so callers never have to check first. */
export function stopProgram(): void {
  if (!currentRun) return;

  currentRun.cancelled = true;
  const waiting = [...currentRun.aborts];
  currentRun.aborts.clear();
  for (const abort of waiting) abort(new ProgramStopped());
}

/** Both the Run button and the capability call this. */
export async function runProgram(workspace: Blockly.Workspace): Promise<void> {
  stopProgram();

  const run: Run = { cancelled: false, aborts: new Set() };
  currentRun = run;
  store.setState({ running: true, error: null });
  // Scratch leaves the sprite where the last run left it. A child who runs the
  // same program twice and gets two different pictures reads the blocks as
  // broken, and has no cheap way to put the sprite back.
  resetSprite();

  // Without a yield inside loops the program holds the main thread and Stop
  // never gets a chance to land.
  javascriptGenerator.INFINITE_LOOP_TRAP = "await __tick();\n";
  const code = javascriptGenerator.workspaceToCode(workspace);

  const session: RunSession = {
    // Unlike print, which returns quietly, this throws: a replaced run has to
    // stop where it stands rather than play out its whole body against the
    // sprite the new run is already moving.
    guard() {
      if (run.cancelled || currentRun !== run) throw new ProgramStopped();
    },
    sleep(ms) {
      return new Promise<void>((resolve, reject) => {
        if (run.cancelled || currentRun !== run) {
          reject(new ProgramStopped());
          return;
        }

        const abort = (reason: unknown): void => {
          clearTimeout(timer);
          reject(reason);
        };
        const timer = setTimeout(() => {
          run.aborts.delete(abort);
          resolve();
        }, ms);
        run.aborts.add(abort);
      });
    },
  };

  /**
   * One frame per time round a loop, which is what makes a program watchable.
   *
   * Scratch runs at 30 frames a second and a loop yields once an iteration, so
   * a repeat takes about a thirtieth of a second a time and a child can watch
   * the sprite go. Yielding straight back instead finishes a four-times loop in
   * under a frame: the sprite is simply somewhere else, and nothing was shown.
   *
   * Straight-line blocks still run inside one frame, as they do in Scratch.
   * Going through `sleep` rather than a bare timer keeps Stop instant.
   */
  const tick = async (): Promise<void> => {
    session.guard();
    await session.sleep(FRAME);
    session.guard();
  };

  try {
    // `new Function` is typed as returning `Function`, which takes any
    // arguments and returns any: the cast is the only way to say what this one
    // is, and the string above is what makes it true.
    const program = new Function("__tick", "__sprite", `return (async () => {\n${code}\n})();`) as (
      tick: () => Promise<void>,
      sprite: ReturnType<typeof createSpriteApi>,
    ) => Promise<void>;

    await program(tick, createSpriteApi(session));
  } catch (error) {
    if (!(error instanceof ProgramStopped) && currentRun === run) {
      store.setState({ error: error instanceof Error ? error.message : String(error) });
    }
  } finally {
    run.aborts.clear();
    if (currentRun === run) {
      currentRun = null;
      // Only the run that is still current clears the bubble, or a stopped run
      // would wipe what the run replacing it has already said.
      setSaying(null);
      store.setState({ running: false });
    }
  }
}

/** For `useStore` in components; everything else goes through the functions above. */
export { store as runStore };
