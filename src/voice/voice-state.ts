import type { VoxideMessage, VoxideStatus } from "@voxide/react";

/** DESIGN.md's three voice states, one colour each. */
export type VoiceState = "asleep" | "listening" | "answering";

// "armed" is the wake word listening locally: nothing is recorded or sent, so
// to the child it is asleep. An error drops back to asleep too, so the next
// press is simply another try.
const STATES = {
  idle: "asleep",
  armed: "asleep",
  error: "asleep",
  connecting: "listening",
  listening: "listening",
  thinking: "answering",
  speaking: "answering",
  executing: "answering",
} as const satisfies Record<VoxideStatus, VoiceState>;

export function voiceStateOf(status: VoxideStatus): VoiceState {
  return STATES[status];
}

/** The newest line one side said, partial included, so "I heard" follows along. */
export function lastLine(
  messages: readonly VoxideMessage[],
  role: VoxideMessage["role"],
): string | null {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role === role && message.text.trim()) return message.text.trim();
  }
  return null;
}
