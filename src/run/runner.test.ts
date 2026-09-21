import * as Blockly from "blockly/core";
import "blockly/blocks";
import "@/blocks/sprite-blocks";
import { afterEach, describe, expect, it } from "vitest";
import { isProgramRunning, runProgram, runStore, stopProgram } from "@/run/runner";
import { initBlocklyLocale } from "@/blockly/locale";
import {
  getSpriteState,
  moveSteps,
  resetSprite,
  setSaying,
  spriteStore,
} from "@/sprite/sprite-store";

// Block definitions interpolate Blockly.Msg; without messages newBlock throws.
initBlocklyLocale();

/** Connects two connections, failing loudly if the block shape changed. */
function connect(
  a: Blockly.Connection | null | undefined,
  b: Blockly.Connection | null | undefined,
) {
  if (!a || !b) throw new Error("expected a connectable block");
  a.connect(b);
}

function workspaceWith(build: (workspace: Blockly.Workspace) => void) {
  const workspace = new Blockly.Workspace();
  build(workspace);
  return workspace;
}

/** `move () steps`, with the number a child would have spoken into the slot. */
function moveBlock(workspace: Blockly.Workspace, steps: number) {
  const move = workspace.newBlock("bloxide_move");
  const value = workspace.newBlock("math_number");
  value.setFieldValue(steps, "NUM");
  connect(move.getInput("STEPS")?.connection, value.outputConnection);
  return move;
}

/** `repeat (times) { ... }`, Blockly's own loop block. */
function repeatBlock(workspace: Blockly.Workspace, times: number, body: Blockly.Block) {
  const loop = workspace.newBlock("controls_repeat_ext");
  const count = workspace.newBlock("math_number");
  count.setFieldValue(times, "NUM");
  connect(loop.getInput("TIMES")?.connection, count.outputConnection);
  connect(loop.getInput("DO")?.connection, body.previousConnection);
  return loop;
}

afterEach(() => {
  stopProgram();
  resetSprite();
});

describe("runProgram", () => {
  it("drives the sprite from the blocks", async () => {
    const workspace = workspaceWith((ws) => moveBlock(ws, 50));

    await runProgram(workspace);

    expect(Math.round(getSpriteState().x)).toBe(50);
    expect(runStore.getState().error).toBeNull();
  });

  it("says what a say block says, and clears the bubble at the end", async () => {
    const workspace = workspaceWith((ws) => {
      const say = ws.newBlock("bloxide_say");
      const words = ws.newBlock("text");
      words.setFieldValue("hello", "TEXT");
      connect(say.getInput("TEXT")?.connection, words.outputConnection);
    });
    const said: (string | null)[] = [];
    const unsubscribe = spriteStore.subscribe(() => said.push(getSpriteState().saying));

    await runProgram(workspace);
    unsubscribe();

    expect(said).toContain("hello");
    expect(getSpriteState().saying).toBeNull();
  });

  it("runs an empty workspace without complaint", async () => {
    await runProgram(new Blockly.Workspace());

    expect(runStore.getState().error).toBeNull();
    expect(isProgramRunning()).toBe(false);
  });

  it("stops a loop partway through", async () => {
    const workspace = workspaceWith((ws) => repeatBlock(ws, 1000, moveBlock(ws, 1)));

    let steps = 0;
    const unsubscribe = spriteStore.subscribe(() => {
      steps += 1;
      if (steps === 3) stopProgram();
    });

    await runProgram(workspace);
    unsubscribe();

    // Stop must actually halt it, not let 1000 iterations finish.
    expect(Math.round(getSpriteState().x)).toBeLessThan(1000);
    expect(isProgramRunning()).toBe(false);
  });

  it("reports that a program is running while it runs", async () => {
    const workspace = workspaceWith((ws) => repeatBlock(ws, 50, moveBlock(ws, 1)));

    let seenRunning = false;
    const unsubscribe = runStore.subscribe(() => {
      seenRunning ||= isProgramRunning();
    });

    await runProgram(workspace);
    unsubscribe();

    expect(seenRunning).toBe(true);
    expect(isProgramRunning()).toBe(false);
  });

  it("ignores a stop when nothing is running", () => {
    expect(() => stopProgram()).not.toThrow();
  });

  it("does not let a replaced run move the sprite the new one owns", async () => {
    const workspace = workspaceWith((ws) => repeatBlock(ws, 1000, moveBlock(ws, 1)));
    const replacement = workspaceWith((ws) => moveBlock(ws, 5));

    const first = runProgram(workspace);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await runProgram(replacement);
    await first;

    // The old run was parked on its timer when the new one started; every
    // step it took afterwards would show up here.
    expect(Math.round(getSpriteState().x)).toBe(5);
  });

  it("cuts a waiting program short the moment Stop lands", async () => {
    const workspace = workspaceWith((ws) => {
      const wait = ws.newBlock("bloxide_wait");
      const seconds = ws.newBlock("math_number");
      seconds.setFieldValue(60, "NUM");
      connect(wait.getInput("SECONDS")?.connection, seconds.outputConnection);
    });

    const running = runProgram(workspace);
    await new Promise((resolve) => setTimeout(resolve, 10));

    stopProgram();
    await running;

    // A bare setTimeout would have kept the program alive for the full minute.
    expect(isProgramRunning()).toBe(false);
  });

  it("puts the sprite back before it starts", async () => {
    // Scratch does not do this. A child who runs the same program twice and
    // gets two different pictures reads the blocks as broken.
    moveSteps(80);

    await runProgram(workspaceWith(() => {}));

    expect(getSpriteState().x).toBe(0);
  });

  it("clears the speech bubble when the program ends", async () => {
    setSaying("hello");

    await runProgram(workspaceWith(() => {}));

    expect(getSpriteState().saying).toBeNull();
  });
});
