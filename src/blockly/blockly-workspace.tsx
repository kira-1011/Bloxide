import { WORKSPACE_OPTIONS } from "@/blockly/options";
import { useBlocklyWorkspace } from "@/blockly/use-blockly-workspace";
import { BlockPalette } from "@/palette/block-palette";
import { useProgramRunner } from "@/run/use-program-runner";
import { SpriteStage } from "@/sprite/sprite-stage";
import { WorkspaceControls } from "@/blockly/workspace-controls";
import { StageResizer } from "@/sprite/stage-resizer";
import { VoiceBar } from "@/voice/voice-bar";

/** Default export: the entry of the lazily loaded editor chunk. */
export default function BlocklyWorkspace() {
  const { containerRef, workspaceRef } = useBlocklyWorkspace({ options: WORKSPACE_OPTIONS });
  const { running, error, run, stop } = useProgramRunner(workspaceRef);

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center gap-3.5 border-b border-edge bg-surface px-6">
        <span className="flex size-9.5 items-center justify-center rounded-xl bg-brand font-display text-2xl font-bold text-white">
          B
        </span>
        <span className="font-display text-[26px] font-bold text-ink">Bloxide</span>
      </header>

      {/* The editor keeps a usable width, and past that the row scrolls, so no
          zone is ever squeezed out of reach. */}
      <div className="flex min-h-0 grow overflow-x-auto">
        <BlockPalette />
        <div className="relative min-w-[480px] grow">
          <div ref={containerRef} className="absolute inset-0" />
          <WorkspaceControls workspaceRef={workspaceRef} />
        </div>
        <StageResizer />
        <SpriteStage />
      </div>

      <VoiceBar running={running} error={error ?? undefined} onRun={run} onStop={stop} />
    </div>
  );
}
