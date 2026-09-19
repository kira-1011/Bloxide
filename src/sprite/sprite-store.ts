import { createStore } from "zustand/vanilla";
import {
  clampPosition,
  clampSize,
  DEFAULT_SPRITE,
  type SpriteState,
  stepDelta,
  wrapDirection,
} from "@/sprite/sprite-state";

// The sprite as shared state. A Zustand vanilla store rather than a React one:
// voice handlers run at module scope and never see a component, so they need a
// store that works without React at all.

const store = createStore<SpriteState>()(() => DEFAULT_SPRITE);

export const getSpriteState = (): SpriteState => store.getState();
export const subscribeToSprite = store.subscribe;

/**
 * Every value the sprite holds is clamped here rather than by whoever is
 * calling, so a program, a voice command and a reset can only ever leave it
 * somewhere legal.
 *
 * A non-finite number does nothing at all: NaN coordinates draw no sprite and
 * report no error, which is the worst of both.
 */
function real(value: number): boolean {
  return Number.isFinite(value);
}

export function resetSprite(): void {
  store.setState(DEFAULT_SPRITE, true);
}

export function moveSteps(steps: number): void {
  if (!real(steps)) return;
  const { x, y, direction } = store.getState();
  const { dx, dy } = stepDelta(direction, steps);
  store.setState(clampPosition(x + dx, y + dy));
}

/** Positive turns right, the way the block reads. */
export function turnDegrees(degrees: number): void {
  if (!real(degrees)) return;
  store.setState({ direction: wrapDirection(store.getState().direction + degrees) });
}

export function goTo(x: number, y: number): void {
  if (!real(x) || !real(y)) return;
  store.setState(clampPosition(x, y));
}

export function changeSize(percent: number): void {
  if (!real(percent)) return;
  store.setState({ size: clampSize(store.getState().size + percent) });
}

export function setVisible(visible: boolean): void {
  store.setState({ visible });
}

export function setSaying(text: string | null): void {
  store.setState({ saying: text === "" ? null : text });
}

/** For components, so nothing outside this module reaches for the store. */
export { store as spriteStore };
