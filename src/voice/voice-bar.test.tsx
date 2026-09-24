import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { armWakeWord, disarmWakeWord } from "@/voice/client";
import { micPermissionStore } from "@/voice/mic-permission";
import { VoiceBar } from "@/voice/voice-bar";

// Our one boundary module to Voxide, mocked so the policy under test — when
// the wake word may listen — can be asserted without a live SDK.
vi.mock(import("@/voice/client"), async (importOriginal) => ({
  ...(await importOriginal()),
  startVoice: vi.fn(() => Promise.resolve()),
  armWakeWord: vi.fn(),
  disarmWakeWord: vi.fn(),
}));

const noop = () => {};

function renderBar(props: Partial<Parameters<typeof VoiceBar>[0]> = {}) {
  return render(<VoiceBar running={false} onRun={noop} onStop={noop} {...props} />);
}

beforeEach(() => {
  micPermissionStore.setState({ permission: "unknown" });
});

describe("VoiceBar", () => {
  it("does not listen for the wake word before the microphone is granted", () => {
    renderBar();
    expect(armWakeWord).not.toHaveBeenCalled();

    act(() => micPermissionStore.setState({ permission: "ask" }));
    expect(armWakeWord).not.toHaveBeenCalled();
  });

  it("listens for the wake word once the microphone is granted", () => {
    renderBar();

    act(() => micPermissionStore.setState({ permission: "granted" }));

    expect(armWakeWord).toHaveBeenCalledOnce();
  });

  it("stops listening when the microphone is taken away again", () => {
    renderBar();
    act(() => micPermissionStore.setState({ permission: "granted" }));

    act(() => micPermissionStore.setState({ permission: "denied" }));

    expect(disarmWakeWord).toHaveBeenCalledOnce();
  });

  it("stops listening on unmount", () => {
    const { unmount } = renderBar();
    act(() => micPermissionStore.setState({ permission: "granted" }));

    unmount();

    expect(disarmWakeWord).toHaveBeenCalledOnce();
  });

  it("runs and stops the program", () => {
    const onRun = vi.fn();
    const onStop = vi.fn();
    renderBar({ running: true, onRun, onStop });

    fireEvent.click(screen.getByRole("button", { name: "Stop program" }));

    expect(onStop).toHaveBeenCalledOnce();
    expect(onRun).not.toHaveBeenCalled();
  });

  it("disables Run while a program runs, and Stop while none does", () => {
    const { unmount } = renderBar({ running: true });
    expect(screen.getByRole("button", { name: "Run program" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop program" })).toBeEnabled();
    unmount();

    renderBar({ running: false });
    expect(screen.getByRole("button", { name: "Run program" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop program" })).toBeDisabled();
  });

  it("says a program is running, so Stop is not the only clue", () => {
    renderBar({ running: true });

    expect(screen.getByText("Running your program…")).toBeInTheDocument();
  });

  it("announces a failure rather than leaving it in the console", () => {
    const { container } = renderBar({ error: "Cannot read property of undefined" });

    const live = container.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("Cannot read property of undefined");
  });

  it("stays quiet when nothing has happened", () => {
    const { container } = renderBar();

    expect(container.querySelector("[aria-live='polite']")).toBeEmptyDOMElement();
  });
});
