// oxlint-disable jsx-a11y/prefer-tag-over-role -- a focusable separator is the ARIA
// window-splitter pattern, and <hr> cannot take focus or report a value.
import type { KeyboardEvent, PointerEvent } from "react";
import { useRef } from "react";
import { useStore } from "zustand";
import {
  growStage,
  setStageWidth,
  STAGE_MAX_WIDTH,
  STAGE_MIN_WIDTH,
  stageSizeStore,
} from "@/sprite/stage-size";

const KEYS: Record<string, () => void> = {
  ArrowLeft: () => growStage(1),
  ArrowRight: () => growStage(-1),
  Home: () => setStageWidth(STAGE_MIN_WIDTH),
  End: () => setStageWidth(STAGE_MAX_WIDTH),
};

function resizeByKey(event: KeyboardEvent<HTMLDivElement>) {
  const action = KEYS[event.key];
  if (!action) return;
  event.preventDefault();
  action();
}

/**
 * The stage's left edge. Drag it, or focus it and press the arrow keys; voice
 * reaches the same store with "make the stage bigger".
 */
export function StageResizer() {
  const { width } = useStore(stageSizeStore);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // The stage is on the right, so dragging its edge left makes it wider.
    setStageWidth(drag.current.startWidth - (event.clientX - drag.current.startX));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the stage"
      aria-valuenow={width}
      aria-valuemin={STAGE_MIN_WIDTH}
      aria-valuemax={STAGE_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={resizeByKey}
      className="group flex w-4 shrink-0 cursor-col-resize touch-none items-center justify-center border-l border-slate-200 bg-slate-50 focus-visible:outline-2 focus-visible:outline-ink"
    >
      <span className="h-16 w-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400 group-focus-visible:bg-ink" />
    </div>
  );
}
