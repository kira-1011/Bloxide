import * as Blockly from "blockly/core";
import "blockly/blocks";
import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { ensureBlocklyLocale } from "@/blockly/locale";

interface UseBlocklyWorkspaceResult {
  /** Attach to the element Blockly should fill. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /**
   * The live workspace. A ref, not state — Blockly mutates it in place, so
   * re-rendering React on every block change would be pure waste, and the
   * voice capabilities need the object itself rather than a snapshot.
   */
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

  // Keeps a changing onChange identity out of the effect's deps, so a caller
  // passing an inline arrow does not tear down the workspace on every render.
  const handleChange = useEffectEvent((workspace: Blockly.WorkspaceSvg) => {
    onChange?.(workspace);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    ensureBlocklyLocale();

    const workspace = Blockly.inject(container, options);
    workspaceRef.current = workspace;

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return;
      handleChange(workspace);
    };
    workspace.addChangeListener(listener);

    // Blockly measures its container once; without this the canvas is the
    // wrong size after any layout change.
    const observer = new ResizeObserver(() => Blockly.svgResize(workspace));
    observer.observe(container);

    return () => {
      observer.disconnect();
      workspace.removeChangeListener(listener);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, [options]);

  return { containerRef, workspaceRef };
}
