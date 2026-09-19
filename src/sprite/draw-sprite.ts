import { type SpriteState, STAGE_HEIGHT, STAGE_WIDTH } from "@/sprite/sprite-state";

// Drawing the stage. Kept thin and free of geometry on purpose: jsdom has no 2d
// context, so what can be tested is the sequence of calls, and everything worth
// checking hard lives in sprite-state.ts instead.

/** Drawn height at 100%, so the sprite is a comfortable share of the stage. */
const BASE_HEIGHT = 130;
const HIDDEN_ALPHA = 0.15;

/**
 * Which way the sprite faces, as a left-right flip rather than a turn.
 *
 * Scratch calls this the left-right rotation style and uses it for exactly this
 * reason: the costume is a character who stands up. Turning it with the heading
 * would leave it upside down at anything past horizontal, which reads as a bug
 * rather than as a direction.
 */
function facesLeft(direction: number): boolean {
  return direction < 0;
}

function drawBubble(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.font = "16px system-ui, sans-serif";
  const width = Math.min(ctx.measureText(text).width + 24, STAGE_WIDTH - 32);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-width / 2, -BASE_HEIGHT, width, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, -BASE_HEIGHT + 17);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteState,
  image: CanvasImageSource | null,
): void {
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  ctx.save();
  // y is stored pointing up; this is the one place that flips it.
  ctx.translate(STAGE_WIDTH / 2 + sprite.x, STAGE_HEIGHT / 2 - sprite.y);

  if (!sprite.visible) ctx.globalAlpha = HIDDEN_ALPHA;

  ctx.save();
  if (facesLeft(sprite.direction)) ctx.scale(-1, 1);
  const scale = sprite.size / 100;

  // A failed image reports complete as well as a loaded one, and drawing one
  // that never arrived throws — which would take the fallback down with it.
  const natural = image ? imageSize(image) : null;
  const usable = image && natural && natural.width > 0 && natural.height > 0;

  if (usable) {
    const height = BASE_HEIGHT * scale;
    const width = height * (natural.width / natural.height);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
  } else {
    // The art loads over the network, and may never arrive; a shape keeps the
    // stage from reading as broken either way.
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(0, 0, (BASE_HEIGHT / 2) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (!sprite.visible) {
    // A hidden sprite still shows, faintly: otherwise "hide" and "lost" look
    // the same, and only one of them can be undone by saying "show".
    ctx.strokeStyle = "#64748b";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, (BASE_HEIGHT / 2) * scale + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = 1;
  if (sprite.saying) drawBubble(ctx, sprite.saying);

  ctx.restore();
}

function imageSize(image: CanvasImageSource): { width: number; height: number } {
  if (typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  const sized = image as { width?: number; height?: number };
  return { width: sized.width ?? 0, height: sized.height ?? 0 };
}
