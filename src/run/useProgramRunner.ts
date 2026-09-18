import type * as Blockly from "blockly/core";
import { type RefObject, useCallback, useState } from "react";
import { runProgram, stopProgram } from "@/run/runner";

export interface OutputLine {
  /** Printing the same text twice is normal, so lines carry an id. */
  readonly id: number;
  readonly text: string;
}

interface UseProgramRunnerResult {
  readonly running: boolean;
  readonly output: readonly OutputLine[];
  readonly error: string | null;
  readonly run: () => void;
  readonly stop: () => void;
}

/** React adapter. The runner stays React-free so voice can call it directly. */
export function useProgramRunner(
  workspaceRef: RefObject<Blockly.WorkspaceSvg | null>,
): UseProgramRunnerResult {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<readonly OutputLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    setOutput([]);
    setError(null);
    setRunning(true);

    runProgram(workspace, {
      onOutput: (text) => setOutput((lines) => [...lines, { id: lines.length, text }]),
    })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setRunning(false));
  }, [workspaceRef]);

  const stop = useCallback(() => stopProgram(), []);

  return { running, output, error, run, stop };
}
