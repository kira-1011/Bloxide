import { WORKSPACE_OPTIONS } from "../blocks";
import { useBlocklyWorkspace } from "../hooks/useBlocklyWorkspace";

export function BlocklyWorkspace() {
  const { containerRef } = useBlocklyWorkspace({ options: WORKSPACE_OPTIONS });

  return <div ref={containerRef} className="h-full w-full" />;
}
