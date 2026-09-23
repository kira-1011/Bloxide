import type { ReactNode, RefObject } from "react";
import { useState } from "react";
import type * as Blockly from "blockly/core";
import { BlockSvg, common } from "blockly/core";
import { getBlockNumber } from "@/blockly/block-view";
import { zoomWorkspace, type ZoomDirection } from "@/blockly/workspace-zoom";
import { deleteBlocks } from "@/voice/handlers";

interface WorkspaceControlsProps {
  readonly workspaceRef: RefObject<Blockly.WorkspaceSvg | null>;
}

/**
 * Zoom and delete, drawn as our own buttons rather than Blockly's: its controls
 * are small fixed images that ignore the theme, and a trash can is a drop
 * target, which only helps someone who can drag.
 */
export function WorkspaceControls({ workspaceRef }: WorkspaceControlsProps) {
  const [said, setSaid] = useState("");

  const zoom = (direction: ZoomDirection) => {
    const workspace = workspaceRef.current;
    if (workspace) zoomWorkspace(workspace, direction);
  };

  // Through the voice command's path, so the stack heals and the numbers move
  // up exactly as they do when the child says "delete block 3".
  const deleteSelected = () => {
    const selected = common.getSelected();
    const block =
      selected instanceof BlockSvg && selected.isShadow() ? selected.getParent() : selected;
    if (!(block instanceof BlockSvg)) {
      setSaid("Pick a block first, then delete it.");
      return;
    }
    const number = getBlockNumber(block);
    setSaid(number === null ? deleteBlocks({ type: block.type }) : deleteBlocks({ number }));
  };

  return (
    <div className="absolute right-5 bottom-5 flex flex-col gap-3">
      <ControlButton label="Zoom in" onClick={() => zoom("in")}>
        <path d="M12 5v14M5 12h14" />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={() => zoom("out")}>
        <path d="M5 12h14" />
      </ControlButton>
      <ControlButton label="Back to normal size" onClick={() => zoom("reset")}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </ControlButton>
      <ControlButton label="Delete the chosen block" onClick={deleteSelected} danger>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </ControlButton>
      <output className="sr-only">{said}</output>
    </div>
  );
}

interface ControlButtonProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly danger?: boolean;
  readonly children: ReactNode;
}

/** DESIGN.md's 60px floor, so a child who cannot aim can still hit it. */
function ControlButton({ label, onClick, danger = false, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-target cursor-pointer items-center justify-center rounded-2xl border-2 bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        danger ? "border-red-200 text-stop hover:bg-red-50" : "border-edge text-ink hover:bg-bg"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-7 fill-none stroke-current stroke-[2.5]"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
