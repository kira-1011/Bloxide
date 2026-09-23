import { fireEvent, render, screen } from "@testing-library/react";
import { VoxideClient, useVoxideVoice } from "@voxide/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceMic } from "@/voice/voice-mic";

vi.mock(import("@voxide/react"), async (importOriginal) => ({
  ...(await importOriginal()),
  useVoxideVoice: vi.fn(),
}));

type Session = ReturnType<typeof useVoxideVoice>;

const connect = vi.fn(() => Promise.resolve());
const disconnect = vi.fn();

function session(overrides: Partial<Session>): Session {
  return {
    status: "idle",
    messages: [],
    currentAction: null,
    errorCode: undefined,
    connect,
    disconnect,
    sendText: () => Promise.resolve(),
    interrupt: () => {},
    wakeAvailable: false,
    wakeArmed: false,
    wakeFailure: undefined,
    wakePhrase: null,
    wakeAutoArm: false,
    armWakeWord: () => {},
    disarmWakeWord: () => {},
    getInputLevel: () => 0,
    getOutputLevel: () => 0,
    endedSession: null,
    submitFeedback: () => Promise.resolve(false),
    dismissFeedback: () => {},
    ...overrides,
  };
}

const client = new VoxideClient({ publicKey: "test" });

function renderMic(overrides: Partial<Session> = {}) {
  vi.mocked(useVoxideVoice).mockReturnValue(session(overrides));
  return render(<VoiceMic client={client} />);
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });
  connect.mockClear();
  disconnect.mockClear();
});

describe("VoiceMic", () => {
  it("asks for the wake phrase while asleep", () => {
    renderMic({ status: "armed", wakeArmed: true, wakePhrase: "hey bloxide" });

    expect(screen.getByText("Say “hey bloxide”")).toBeInTheDocument();
  });

  it("offers press-to-talk where there is no wake word", () => {
    renderMic();

    fireEvent.click(screen.getByRole("button", { name: "Start listening" }));

    expect(connect).toHaveBeenCalledOnce();
  });

  it("shows what it heard while listening, and stops when pressed", () => {
    renderMic({ status: "listening", messages: [{ role: "user", text: "add a repeat block" }] });

    expect(screen.getByText("I am listening…")).toBeInTheDocument();
    expect(screen.getByText("“add a repeat block”")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
    expect(disconnect).toHaveBeenCalledOnce();
    expect(connect).not.toHaveBeenCalled();
  });

  it("shows the answer it gave", () => {
    renderMic({
      status: "speaking",
      messages: [
        { role: "user", text: "add a repeat block" },
        { role: "ai", text: "Added a repeat block. It is block 2." },
      ],
    });

    expect(screen.getByText("Added a repeat block. It is block 2.")).toBeInTheDocument();
  });

  it("says a failed connection out loud, and lets the next press retry", () => {
    renderMic({ status: "error" });

    expect(screen.getByText(/could not hear you/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start listening" })).toBeEnabled();
  });
});
