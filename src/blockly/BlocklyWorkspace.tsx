import { WORKSPACE_OPTIONS } from "@/blockly/options";
import { useBlocklyWorkspace } from "@/blockly/useBlocklyWorkspace";

/**
 * Default export: this file is the entry of the lazily loaded editor chunk.
 */
export default function BlocklyWorkspace() {
  const { containerRef } = useBlocklyWorkspace({ options: WORKSPACE_OPTIONS });

  return <div ref={containerRef} className="h-full w-full" />;
}
