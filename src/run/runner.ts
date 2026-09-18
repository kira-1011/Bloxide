import type * as Blockly from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

/** Thrown by the loop trap to unwind a stopped program. */
class ProgramStopped extends Error {}

interface Run {
  cancelled: boolean;
}

let currentRun: Run | null = null;

export interface RunProgramOptions {
  readonly onOutput?: (line: string) => void;
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

/** Runs the child's blocks. The `runProgram` capability calls this too. */
export async function runProgram(
  workspace: Blockly.Workspace,
  { onOutput }: RunProgramOptions = {},
): Promise<void> {
  stopProgram();

  const run: Run = { cancelled: false };
  currentRun = run;

  // Without a yield inside loops the program holds the main thread and Stop
  // never gets a chance to land.
  javascriptGenerator.INFINITE_LOOP_TRAP = "await __tick();\n";
  const code = javascriptGenerator.workspaceToCode(workspace);

  const tick = async (): Promise<void> => {
    if (run.cancelled) throw new ProgramStopped();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const print = (value: unknown): void => onOutput?.(String(value));

  try {
    const program = new Function("__tick", "print", `return (async () => {\n${code}\n})();`) as (
      tick: () => Promise<void>,
      print: (value: unknown) => void,
    ) => Promise<void>;

    await program(tick, print);
  } catch (error) {
    if (!(error instanceof ProgramStopped)) throw error;
  } finally {
    if (currentRun === run) currentRun = null;
  }
}
