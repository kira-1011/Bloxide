import { describe, expect, it, vi } from "vitest";
import { drawSprite } from "@/sprite/draw-sprite";
import { DEFAULT_SPRITE, STAGE_HEIGHT, STAGE_WIDTH } from "@/sprite/sprite-state";

// jsdom has no 2d context, so the stage is checked by what it asks the context
// to do. Geometry worth checking hard lives in sprite-state.ts.
function recordingContext() {
  const calls: { name: string; args: unknown[] }[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
    };

  const context = {
    calls,
    argsOf: (name: string) => calls.filter((call) => call.name === name).map((c) => c.args),
    measureText: vi.fn(() => ({ width: 40 })),
    save: record("save"),
    restore: record("restore"),
    clearRect: record("clearRect"),
    fillRect: record("fillRect"),
    translate: record("translate"),
    rotate: record("rotate"),
    drawImage: record("drawImage"),
    beginPath: record("beginPath"),
    arc: record("arc"),
    rect: record("rect"),
    fill: record("fill"),
    stroke: record("stroke"),
    setLineDash: record("setLineDash"),
    fillText: record("fillText"),
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
  };

  return context as unknown as CanvasRenderingContext2D & {
    calls: typeof calls;
    argsOf: (name: string) => unknown[][];
  };
}

const image = { width: 100, height: 100 } as unknown as CanvasImageSource;

describe("drawSprite", () => {
  it("flips y so a positive y is drawn up the screen", () => {
    const ctx = recordingContext();

    drawSprite(ctx, { ...DEFAULT_SPRITE, x: 40, y: 60 }, image);

    expect(ctx.argsOf("translate")[0]).toEqual([STAGE_WIDTH / 2 + 40, STAGE_HEIGHT / 2 - 60]);
  });

  it("does not turn the sprite when it faces the default direction", () => {
    const ctx = recordingContext();

    drawSprite(ctx, DEFAULT_SPRITE, image);

    expect(ctx.argsOf("rotate")[0]).toEqual([0]);
  });

  it("turns the sprite with its heading", () => {
    const ctx = recordingContext();

    drawSprite(ctx, { ...DEFAULT_SPRITE, direction: 180 }, image);

    expect(ctx.argsOf("rotate")[0]).toEqual([Math.PI / 2]);
  });

  it("draws a shape when the art has not loaded", () => {
    const ctx = recordingContext();

    drawSprite(ctx, DEFAULT_SPRITE, null);

    expect(ctx.argsOf("drawImage")).toHaveLength(0);
    expect(ctx.argsOf("arc").length).toBeGreaterThan(0);
  });

  it("falls back to a shape when the art failed to load", () => {
    // A failed image reports complete as well as a loaded one, and drawing it
    // throws — which would take the fallback down with it.
    const ctx = recordingContext();
    const broken = { width: 0, height: 0 } as unknown as CanvasImageSource;

    drawSprite(ctx, DEFAULT_SPRITE, broken);

    expect(ctx.argsOf("drawImage")).toHaveLength(0);
    expect(ctx.argsOf("arc").length).toBeGreaterThan(0);
  });

  it("still draws a hidden sprite, faintly and outlined", () => {
    const ctx = recordingContext();

    drawSprite(ctx, { ...DEFAULT_SPRITE, visible: false }, image);

    // Hidden and lost must not look the same: "show" can undo only one of them.
    expect(ctx.argsOf("drawImage")).toHaveLength(1);
    expect(ctx.argsOf("setLineDash")[0]).toEqual([[6, 6]]);
  });

  it("draws the speech bubble only when there is something to say", () => {
    const quiet = recordingContext();
    drawSprite(quiet, DEFAULT_SPRITE, image);
    expect(quiet.argsOf("fillText")).toHaveLength(0);

    const talking = recordingContext();
    drawSprite(talking, { ...DEFAULT_SPRITE, saying: "hello" }, image);
    expect(talking.argsOf("fillText")[0]?.[0]).toBe("hello");
  });
});
