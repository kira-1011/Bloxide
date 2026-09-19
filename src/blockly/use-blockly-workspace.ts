import * as Blockly from "blockly/core";
import "blockly/blocks";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { setActiveWorkspace } from "@/blockly/active-workspace";
import { numberBlocks } from "@/blockly/block-view";
import { initBlocklyLocale } from "@/blockly/locale";
import { loadWorkspace, saveWorkspace } from "@/blockly/storage";

interface UseBlocklyWorkspaceResult {
  /** Attach to the element Blockly should fill. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** A ref, not state: Blockly mutates in place and voice needs the object. */
  readonly workspaceRef: RefObject<Blockly.WorkspaceSvg | null>;
}

interface UseBlocklyWorkspaceParams {
  /** Pass a module-level constant; a fresh object re-injects the workspace. */
  readonly options: Blockly.BlocklyOptions;
  readonly onChange?: (workspace: Blockly.WorkspaceSvg) => void;
}

/**
 * Injects one Blockly workspace into `containerRef` and disposes it on unmount.
 */
export function useBlocklyWorkspace({
  options,
  onChange,
}: UseBlocklyWorkspaceParams): UseBlocklyWorkspaceResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  // Keeps onChange out of the effect deps: an inline arrow would otherwise
  // re-inject on every render and throw away the program.
  const handleChange = useEffectEvent((workspace: Blockly.WorkspaceSvg) => {
    onChange?.(workspace);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    initBlocklyLocale();

    const workspace = Blockly.inject(container, options);
    workspaceRef.current = workspace;
    setActiveWorkspace(workspace);

    // Restore before listening, or the load is heard as a change.
    loadWorkspace(workspace);
    numberBlocks(workspace);

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return;
      numberBlocks(workspace);
      saveWorkspace(workspace);
      handleChange(workspace);
    };
    workspace.addChangeListener(listener);

    // Blockly measures its container once.
    const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
    observer.observe(container);

    return () => {
      observer.disconnect();
      workspace.removeChangeListener(listener);
      workspace.dispose();
      workspaceRef.current = null;
      setActiveWorkspace(null);
    };
  }, [options]);

  return { containerRef, workspaceRef };
}
