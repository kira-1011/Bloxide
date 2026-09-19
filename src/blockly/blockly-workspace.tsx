import { WORKSPACE_OPTIONS } from "@/blockly/options";
import { useBlocklyWorkspace } from "@/blockly/use-blockly-workspace";
import { OutputPanel } from "@/run/output-panel";
import { RunControls } from "@/run/run-controls";
import { useProgramRunner } from "@/run/use-program-runner";
import { SpriteStage } from "@/sprite/sprite-stage";

/** Default export: the entry of the lazily loaded editor chunk. */
export default function BlocklyWorkspace() {
  const { containerRef, workspaceRef } = useBlocklyWorkspace({ options: WORKSPACE_OPTIONS });
  const { running, output, error, run, stop } = useProgramRunner(workspaceRef);

  return (
    <div className="flex h-full w-full flex-col">
      <RunControls running={running} onRun={run} onStop={stop} />
      {/*
        The stage sits beside the editor for now. Direction B of the design
        swaps the two on a mode switch, which is not built yet.
      */}
      <div className="flex min-h-0 flex-1">
        <div ref={containerRef} className="min-h-0 min-w-0 flex-1" />
        <SpriteStage />
      </div>
      <OutputPanel output={output} error={error} />
    </div>
  );
}
