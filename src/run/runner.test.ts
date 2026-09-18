import * as Blockly from "blockly/core";
import "blockly/blocks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isProgramRunning, runProgram, stopProgram } from "@/run/runner";
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
    const onOutput = vi.fn();
    const workspace = workspaceWith((ws) => printBlock(ws, "hello"));

    await runProgram(workspace, { onOutput });

    // window.alert cannot be dismissed by voice, so text_print must not use it.
    expect(onOutput).toHaveBeenCalledWith("hello");
  });

  it("runs an empty workspace without complaint", async () => {
    const onOutput = vi.fn();

    await runProgram(new Blockly.Workspace(), { onOutput });

    expect(onOutput).not.toHaveBeenCalled();
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

    let printed = 0;
    const running = runProgram(workspace, {
      onOutput: () => {
        printed += 1;
        if (printed === 3) stopProgram();
      },
    });

    await running;

    // Stop must actually halt it, not let 1000 iterations finish.
    expect(printed).toBeLessThan(1000);
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
    await runProgram(workspace, {
      onOutput: () => {
        seenRunning ||= isProgramRunning();
      },
    });

    expect(seenRunning).toBe(true);
    expect(isProgramRunning()).toBe(false);
  });

  it("ignores a stop when nothing is running", () => {
    expect(() => stopProgram()).not.toThrow();
  });
});
