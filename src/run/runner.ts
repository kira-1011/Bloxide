import type * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

/** Thrown by the loop trap to unwind a stopped program. */
class ProgramStopped extends Error {}

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
}

let currentRun: Run | null = null;

// The state lives here rather than in React because a program can be started by
// a button or by voice, and both must see the same run.
let state: RunState = { running: false, output: [], error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<RunState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function subscribeToRun(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Stable between changes, as useSyncExternalStore requires. */
export function getRunState(): RunState {
  return state;
}

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
  if (currentRun) currentRun.cancelled = true;
}

/** Both the Run button and the capability call this. */
export async function runProgram(workspace: Blockly.Workspace): Promise<void> {
  stopProgram();

  const run: Run = { cancelled: false };
  currentRun = run;
  setState({ running: true, output: [], error: null });

  // Without a yield inside loops the program holds the main thread and Stop
  // never gets a chance to land.
  javascriptGenerator.INFINITE_LOOP_TRAP = "await __tick();\n";
  const code = javascriptGenerator.workspaceToCode(workspace);

  const tick = async (): Promise<void> => {
    if (run.cancelled) throw new ProgramStopped();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const print = (value: unknown): void => {
    setState({ output: [...state.output, { id: state.output.length, text: String(value) }] });
  };

  try {
    const program = new Function("__tick", "print", `return (async () => {\n${code}\n})();`) as (
      tick: () => Promise<void>,
      print: (value: unknown) => void,
    ) => Promise<void>;

    await program(tick, print);
  } catch (error) {
    if (!(error instanceof ProgramStopped)) {
      setState({ error: error instanceof Error ? error.message : String(error) });
    }
  } finally {
    if (currentRun === run) {
      currentRun = null;
      setState({ running: false });
    }
  }
}
