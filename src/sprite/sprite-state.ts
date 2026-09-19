// Where the sprite is and how it is drawn, in Scratch's terms: a centred stage,
// y pointing up, and a direction where 90 is to the right. A child who has seen
// Scratch already knows what these numbers mean.

export interface SpriteState {
  /** Centre origin, positive to the right. */
  readonly x: number;
  /** Centre origin, positive **up** — the screen flips this, nothing else does. */
  readonly y: number;
  /** Degrees clockwise, 90 right, 0 up, in (-180, 180]. */
  readonly direction: number;
  /** Percent of the drawn size. */
  readonly size: number;
  readonly visible: boolean;
  /** What is in the speech bubble, or nothing. */
  readonly saying: string | null;
}

export const STAGE_WIDTH = 480;
export const STAGE_HEIGHT = 360;

const MIN_SIZE = 25;
const MAX_SIZE = 400;

export const DEFAULT_SPRITE: SpriteState = {
  x: 0,
  y: 0,
  direction: 90,
  size: 100,
  visible: true,
  saying: null,
};

/** Scratch's range: -179 is the same heading as 181, and reads better spoken. */
export function wrapDirection(degrees: number): number {
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/**
 * Keeps the sprite's centre on the stage.
 *
 * Stricter than Scratch, which lets a sprite hang almost entirely off the edge.
 * A child who cannot point cannot go and fetch it back, so half of it is always
 * on screen.
 */
export function clampPosition(x: number, y: number): { x: number; y: number } {
  const halfWidth = STAGE_WIDTH / 2;
  const halfHeight = STAGE_HEIGHT / 2;
  return {
    x: Math.min(Math.max(x, -halfWidth), halfWidth),
    y: Math.min(Math.max(y, -halfHeight), halfHeight),
  };
}

/** Below the floor a sprite is a dot, which is the same as losing it. */
export function clampSize(percent: number): number {
  return Math.min(Math.max(percent, MIN_SIZE), MAX_SIZE);
}

/** How far a heading carries, with y up — the screen does the flipping. */
export function stepDelta(direction: number, steps: number): { dx: number; dy: number } {
  const radians = (direction * Math.PI) / 180;
  return { dx: Math.sin(radians) * steps, dy: Math.cos(radians) * steps };
}

/** The sprite's only non-visual channel: what a screen reader is told. */
export function describeSprite(sprite: SpriteState): string {
  const place = `x ${Math.round(sprite.x)}, y ${Math.round(sprite.y)}`;
  const facing = `facing ${Math.round(sprite.direction)} degrees`;
  const hidden = sprite.visible ? "" : ", hidden";
  const saying = sprite.saying ? `, saying ${sprite.saying}` : "";
  return `Sprite at ${place}, ${facing}${hidden}${saying}`;
}
