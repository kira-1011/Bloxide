import type * as Blockly from "blockly/core";
import { type RefObject, useCallback } from "react";
import { useStore } from "zustand";
import { type RunState, runProgram, runStore, stopProgram } from "@/run/runner";

interface UseProgramRunnerResult extends RunState {
  readonly run: () => void;
  readonly stop: () => void;
}

/**
 * React adapter over the runner's store, so a program started by voice shows
 * the same running state and output as one started by the button.
 */
export function useProgramRunner(
  workspaceRef: RefObject<Blockly.WorkspaceSvg | null>,
): UseProgramRunnerResult {
  const state = useStore(runStore);

  const run = useCallback(() => {
    const workspace = workspaceRef.current;
    if (workspace) void runProgram(workspace);
  }, [workspaceRef]);

  const stop = useCallback(() => stopProgram(), []);

  return { ...state, run, stop };
}
