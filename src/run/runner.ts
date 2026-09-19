import type * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import "@/blocks/sprite-generators";
import { createStore } from "zustand/vanilla";
import { ProgramStopped } from "@/run/program-stopped";
import { createSpriteApi, type RunSession } from "@/sprite/sprite-api";
import { resetSprite, setSaying } from "@/sprite/sprite-store";

export interface OutputLine {
  /** Printing the same text twice is normal, so lines carry an id. */
  readonly id: number;
  readonly text: string;
}

export interface RunState {
  readonly running: boolean;
  readonly output: readonly OutputLine[];
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

// A handle the cancellation guards compare by identity, not reactive state.
let currentRun: Run | null = null;

// The state lives here rather than in React because a program can be started by
// a button or by voice, and both must see the same run.
const store = createStore<RunState>()(() => ({ running: false, output: [], error: null }));

export const subscribeToRun = store.subscribe;

/** Stable between changes, as the React binding requires. */
export const getRunState = (): RunState => store.getState();

// window.alert cannot be dismissed by voice.
javascriptGenerator.forBlock["text_print"] = (block, generator) => {
  const value = generator.valueToCode(block, "TEXT", Order.NONE) || '""';
  return `print(${value});\n`;
};

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
  store.setState({ running: true, output: [], error: null });
  // Scratch leaves the sprite where the last run left it. A child who runs the
  // same program twice and gets two different pictures reads the blocks as
  // broken, and has no cheap way to put the sprite back.
  resetSprite();

  // Without a yield inside loops the program holds the main thread and Stop
  // never gets a chance to land.
  javascriptGenerator.INFINITE_LOOP_TRAP = "await __tick();\n";
  const code = javascriptGenerator.workspaceToCode(workspace);

  // Checked on both sides of the yield: a second run can start, and replace
  // currentRun, while this one is parked on the timer.
  const tick = async (): Promise<void> => {
    if (run.cancelled) throw new ProgramStopped();
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (run.cancelled) throw new ProgramStopped();
  };
  const print = (value: unknown): void => {
    if (currentRun !== run) return;
    store.setState(({ output }) => ({
      output: [...output, { id: output.length, text: String(value) }],
    }));
  };

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

  try {
    const program = new Function(
      "__tick",
      "print",
      "__sprite",
      `return (async () => {\n${code}\n})();`,
    ) as (
      tick: () => Promise<void>,
      print: (value: unknown) => void,
      sprite: ReturnType<typeof createSpriteApi>,
    ) => Promise<void>;

    await program(tick, print, createSpriteApi(session));
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
