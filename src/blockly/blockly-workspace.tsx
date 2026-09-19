import { WORKSPACE_OPTIONS } from "@/blockly/options";
import { useBlocklyWorkspace } from "@/blockly/use-blockly-workspace";
import { OutputPanel } from "@/run/output-panel";
import { RunControls } from "@/run/run-controls";
import { useProgramRunner } from "@/run/use-program-runner";

/** Default export: the entry of the lazily loaded editor chunk. */
export default function BlocklyWorkspace() {
  const { containerRef, workspaceRef } = useBlocklyWorkspace({ options: WORKSPACE_OPTIONS });
  const { running, output, error, run, stop } = useProgramRunner(workspaceRef);

  return (
    <div className="flex h-full w-full flex-col">
      <RunControls running={running} onRun={run} onStop={stop} />
      <div ref={containerRef} className="min-h-0 flex-1" />
      <OutputPanel output={output} error={error} />
    </div>
  );
}
