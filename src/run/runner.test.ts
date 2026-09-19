import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, describe, expect, it } from "vitest";
import {
  getRunState,
  isProgramRunning,
  runProgram,
  stopProgram,
  subscribeToRun,
} from "@/run/runner";
import { initBlocklyLocale } from "@/blockly/locale";

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

/** `print "hello"` */
function printBlock(workspace: Blockly.Workspace, text: string) {
  const print = workspace.newBlock("text_print");
  const value = workspace.newBlock("text");
  value.setFieldValue(text, "TEXT");
  connect(print.getInput("TEXT")?.connection, value.outputConnection);
  return print;
}

afterEach(() => {
  stopProgram();
});

describe("runProgram", () => {
  it("prints to the output rather than a browser dialog", async () => {
    const workspace = workspaceWith((ws) => printBlock(ws, "hello"));

    await runProgram(workspace);

    // window.alert cannot be dismissed by voice, so text_print must not use it.
    expect(getRunState().output.map((line) => line.text)).toEqual(["hello"]);
  });

  it("runs an empty workspace without complaint", async () => {
    await runProgram(new Blockly.Workspace());

    expect(getRunState().output).toEqual([]);
    expect(isProgramRunning()).toBe(false);
  });

  it("stops a loop partway through", async () => {
    const workspace = workspaceWith((ws) => {
      const loop = ws.newBlock("controls_repeat_ext");
      const times = ws.newBlock("math_number");
      times.setFieldValue("1000", "NUM");
      connect(loop.getInput("TIMES")?.connection, times.outputConnection);
      const print = printBlock(ws, "tick");
      connect(loop.getInput("DO")?.connection, print.previousConnection);
    });

    const unsubscribe = subscribeToRun(() => {
      if (getRunState().output.length === 3) stopProgram();
    });

    await runProgram(workspace);
    unsubscribe();

    // Stop must actually halt it, not let 1000 iterations finish.
    expect(getRunState().output.length).toBeLessThan(1000);
    expect(isProgramRunning()).toBe(false);
  });

  it("reports that a program is running while it runs", async () => {
    const workspace = workspaceWith((ws) => {
      const loop = ws.newBlock("controls_repeat_ext");
      const times = ws.newBlock("math_number");
      times.setFieldValue("50", "NUM");
      connect(loop.getInput("TIMES")?.connection, times.outputConnection);
      const print = printBlock(ws, "tick");
      connect(loop.getInput("DO")?.connection, print.previousConnection);
    });

    let seenRunning = false;
    const unsubscribe = subscribeToRun(() => {
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

  it("does not let a replaced run write into the new one", async () => {
    const workspace = workspaceWith((ws) => {
      const loop = ws.newBlock("controls_repeat_ext");
      const times = ws.newBlock("math_number");
      times.setFieldValue("1000", "NUM");
      connect(loop.getInput("TIMES")?.connection, times.outputConnection);
      const print = printBlock(ws, "old");
      connect(loop.getInput("DO")?.connection, print.previousConnection);
    });
    const replacement = workspaceWith((ws) => printBlock(ws, "new"));

    const first = runProgram(workspace);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await runProgram(replacement);
    await first;

    // The old run was parked on its timer when the new one started; anything
    // it printed afterwards must not appear here.
    expect(getRunState().output.map((line) => line.text)).toEqual(["new"]);
  });
});
