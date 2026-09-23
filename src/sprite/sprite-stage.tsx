// oxlint-disable jsx-a11y/prefer-tag-over-role -- a canvas cannot be an <img>, and the
// role is the only thing that gets it announced at all.
import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { describeSprite, STAGE_HEIGHT, STAGE_WIDTH } from "@/sprite/sprite-state";
import { drawSprite } from "@/sprite/draw-sprite";
import { spriteStore } from "@/sprite/sprite-store";

const SPRITE_SRC = "/sprite/robot.png";

/**
 * Loaded once for the life of the page rather than per mount: the art is the
 * same for every stage, and a reload would blank the canvas on every remount.
 */
const costume = typeof Image === "undefined" ? null : new Image();
if (costume) costume.src = SPRITE_SRC;

export function SpriteStage() {
  const sprite = useStore(spriteStore);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sizing is separate from painting because setting width or height clears the
  // canvas: doing it on every sprite change would blank the stage mid-run.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    // jsdom has no 2d context, and neither does a canvas that failed to create.
    if (!canvas || !context) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = STAGE_WIDTH * ratio;
    canvas.height = STAGE_HEIGHT * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }, []);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    const paint = () => {
      // drawSprite decides whether the art is usable; an image that failed to
      // load reports complete too.
      drawSprite(context, sprite, costume);
    };

    paint();
    // The first paint can beat the art over the network; repaint when it lands.
    if (costume && !costume.complete) {
      costume.addEventListener("load", paint, { once: true });
      return () => costume.removeEventListener("load", paint);
    }
  }, [sprite]);

  return (
    <div className="flex min-w-60 flex-col items-center gap-2 border-l border-slate-200 bg-slate-50 p-4">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={describeSprite(sprite)}
        className="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white"
        style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}` }}
      />
      {sprite.visible ? null : (
        <p className="text-sm text-slate-500">
          Sprite is hidden — say <strong>show</strong>
        </p>
      )}
    </div>
  );
}
