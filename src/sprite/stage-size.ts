import { createStore } from "zustand/vanilla";

export const STAGE_MIN_WIDTH = 240;
export const STAGE_MAX_WIDTH = 720;
export const STAGE_DEFAULT_WIDTH = 512;
/** Big enough that one keypress or one "bigger" is plainly visible. */
export const STAGE_STEP = 80;

interface StageSize {
  readonly width: number;
}

export const stageSizeStore = createStore<StageSize>()(() => ({ width: STAGE_DEFAULT_WIDTH }));

export const getStageWidth = (): number => stageSizeStore.getState().width;

/** Clamped here, so a drag, a key and a voice command cannot disagree. */
export function setStageWidth(width: number): void {
  if (!Number.isFinite(width)) return;
  const clamped = Math.round(Math.min(STAGE_MAX_WIDTH, Math.max(STAGE_MIN_WIDTH, width)));
  stageSizeStore.setState({ width: clamped });
}

/** Grows by whole steps; false when it was already at the limit. */
export function growStage(steps: number): boolean {
  const before = getStageWidth();
  setStageWidth(before + steps * STAGE_STEP);
  return getStageWidth() !== before;
}

export function resetStageWidth(): void {
  stageSizeStore.setState({ width: STAGE_DEFAULT_WIDTH });
}
