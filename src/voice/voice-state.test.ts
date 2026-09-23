import { describe, expect, it } from "vitest";
import { lastLine, voiceStateOf } from "@/voice/voice-state";

describe("voiceStateOf", () => {
  it("keeps the wake word asleep, since nothing is recorded yet", () => {
    expect(voiceStateOf("idle")).toBe("asleep");
    expect(voiceStateOf("armed")).toBe("asleep");
  });

  it("drops an error back to asleep, so the next press is another try", () => {
    expect(voiceStateOf("error")).toBe("asleep");
  });

  it("listens while connecting and listening", () => {
    expect(voiceStateOf("connecting")).toBe("listening");
    expect(voiceStateOf("listening")).toBe("listening");
  });

  it("answers while thinking, acting and speaking", () => {
    expect(voiceStateOf("thinking")).toBe("answering");
    expect(voiceStateOf("executing")).toBe("answering");
    expect(voiceStateOf("speaking")).toBe("answering");
  });
});

describe("lastLine", () => {
  const messages = [
    { role: "user", text: "add a move block" },
    { role: "ai", text: "Added a move block. It is block 1." },
    { role: "user", text: "make it ten", partial: true },
    { role: "ai", text: "  " },
  ] as const;

  it("finds the newest line from one side, partial included", () => {
    expect(lastLine(messages, "user")).toBe("make it ten");
  });

  it("skips a blank line", () => {
    expect(lastLine(messages, "ai")).toBe("Added a move block. It is block 1.");
  });

  it("is null before anyone has spoken", () => {
    expect(lastLine([], "user")).toBeNull();
  });
});
