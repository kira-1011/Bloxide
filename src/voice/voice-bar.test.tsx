import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceBar } from "@/voice/voice-bar";

const noop = () => {};

function renderBar(props: Partial<Parameters<typeof VoiceBar>[0]> = {}) {
  return render(<VoiceBar running={false} onRun={noop} onStop={noop} {...props} />);
}

describe("VoiceBar", () => {
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
