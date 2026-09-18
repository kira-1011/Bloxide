import { render } from "@testing-library/react";
import type * as Blockly from "blockly/core";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBlocklyWorkspace } from "@/blockly/useBlocklyWorkspace";

/**
 * Blockly measures real SVG geometry, which jsdom does not implement, so the
 * library is mocked at the seam. What is under test is our adapter — that it
 * injects once, tears down completely, and does not re-inject when it should
 * not — not Blockly's rendering.
 */
const dispose = vi.fn();
const addChangeListener = vi.fn();
const removeChangeListener = vi.fn();
const inject = vi.fn();
const svgResize = vi.fn();
const ensureBlocklyLocale = vi.fn();

const observe = vi.fn();
const disconnect = vi.fn();

vi.mock(import("blockly/core"), () => ({
  inject: (...args: unknown[]) => inject(...args),
  svgResize: (...args: unknown[]) => svgResize(...args),
}));
vi.mock(import("blockly/blocks"), () => ({}));
vi.mock(import("@/blockly/locale"), () => ({
  ensureBlocklyLocale: () => ensureBlocklyLocale(),
}));

const OPTIONS = { renderer: "zelos" } as Blockly.BlocklyOptions;

function makeWorkspace() {
  return { dispose, addChangeListener, removeChangeListener } as unknown as Blockly.WorkspaceSvg;
}

function Harness({
  options = OPTIONS,
  onChange,
}: {
  options?: Blockly.BlocklyOptions;
  onChange?: (workspace: Blockly.WorkspaceSvg) => void;
}) {
  const params = onChange ? { options, onChange } : { options };
  const { containerRef } = useBlocklyWorkspace(params);
  return <div ref={containerRef} data-testid="container" />;
}

/** Fires the listener the hook registered with the workspace. */
function emit(event: Partial<Blockly.Events.Abstract>) {
  const listener = addChangeListener.mock.calls[0]?.[0] as (
    event: Partial<Blockly.Events.Abstract>,
  ) => void;
  listener(event);
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    },
  );
  inject.mockReturnValue(makeWorkspace());
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("useBlocklyWorkspace", () => {
  it("injects one workspace into the container with the given options", () => {
    const { getByTestId } = render(<Harness />);

    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject).toHaveBeenCalledWith(getByTestId("container"), OPTIONS);
  });

  it("installs the locale before injecting, or inject throws on an aria label", () => {
    render(<Harness />);

    expect(ensureBlocklyLocale).toHaveBeenCalled();
    expect(ensureBlocklyLocale.mock.invocationCallOrder[0]).toBeLessThan(
      inject.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("exposes the live workspace on a ref rather than in state", () => {
    const workspace = makeWorkspace();
    inject.mockReturnValue(workspace);
    // One entry per committed render, holding what the ref read at that point.
    const commits: (Blockly.WorkspaceSvg | null)[] = [];

    function ReadsRef() {
      const { containerRef, workspaceRef } = useBlocklyWorkspace({ options: OPTIONS });
      useEffect(() => {
        commits.push(workspaceRef.current);
      });
      return <div ref={containerRef} />;
    }

    render(<ReadsRef />);

    // State would have re-rendered React to publish the workspace; a ref does
    // not, and the child adds blocks far too often to pay that cost.
    expect(commits).toEqual([workspace]);
  });

  it("disposes the workspace and its listeners on unmount", () => {
    const { unmount } = render(<Harness />);

    unmount();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(removeChangeListener).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("resizes the workspace when the container resizes", () => {
    render(<Harness />);

    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("reports real changes but ignores UI events", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    emit({ isUiEvent: true });
    expect(onChange).not.toHaveBeenCalled();

    emit({ isUiEvent: false });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the workspace when only the onChange identity changes", () => {
    const { rerender } = render(<Harness onChange={() => {}} />);

    rerender(<Harness onChange={() => {}} />);

    // A re-injected workspace would throw away the child's program.
    expect(inject).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
  });

  it("calls the latest onChange, not the one captured at mount", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness onChange={first} />);

    rerender(<Harness onChange={second} />);
    emit({ isUiEvent: false });

    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("re-injects when the options object changes", () => {
    const { rerender } = render(<Harness />);

    rerender(<Harness options={{ renderer: "geras" } as Blockly.BlocklyOptions} />);

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(inject).toHaveBeenCalledTimes(2);
  });
});
