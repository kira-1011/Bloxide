import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceBar, type VoiceState } from "@/voice/voice-bar";

const noop = () => {};

function renderBar(props: Partial<Parameters<typeof VoiceBar>[0]> = {}) {
  return render(
    <VoiceBar state="listening" running={false} onRun={noop} onStop={noop} {...props} />,
  );
}

describe("VoiceBar", () => {
  it("names each state in words, never by colour alone", () => {
    const headings: Record<VoiceState, string> = {
      asleep: "Say “Hey Bloxide”",
      listening: "I am listening…",
      answering: "Here is what I did",
    };

    for (const [state, heading] of Object.entries(headings)) {
      const { unmount } = renderBar({ state: state as VoiceState });
      expect(screen.getByText(heading)).toBeInTheDocument();
      unmount();
    }
  });

  it("shows what was heard, so a wrong word can be seen and corrected", () => {
    renderBar({ heard: "“say hello”" });

    expect(screen.getByText("I heard")).toBeInTheDocument();
    expect(screen.getByText("“say hello”")).toBeInTheDocument();
  });

  it("leaves the transcript out before anything has been said", () => {
    renderBar({ state: "asleep" });

    expect(screen.queryByText("I heard")).not.toBeInTheDocument();
  });

  it("announces changes, so the child is told rather than having to look", () => {
    const { container } = renderBar({ answer: "Added a say block. It is block 4." });

    const live = container.querySelector("[aria-live='polite']");
    expect(live).toHaveTextContent("Added a say block. It is block 4.");
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
});
