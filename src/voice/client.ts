import { VoxideClient } from "@voxide/react";
import { describeProgram } from "@/voice/program-state";
import { VOICE_ACTIONS } from "@/voice/handlers";

const publicKey = import.meta.env.VITE_VOXIDE_PUBLIC_KEY;

/**
 * Module scope, so capabilities register once and a call survives re-renders.
 * Null without a key — the editor still works for a clone with no Voxide
 * account.
 */
export const voice: VoxideClient | null = publicKey
  ? new VoxideClient({ publicKey })
      .register(VOICE_ACTIONS)
      // Read before every utterance, so the agent answers from the workspace
      // rather than from what it believes it did.
      .bindState(() => describeProgram())
  : null;

let started: Promise<void> | null = null;

/**
 * Loads the dashboard's config. Voxide's own widget did this; we draw our own
 * mic, so we do it. Once per page, however many times a remount asks.
 *
 * Reads no audio: arming is deliberately not part of this, because the promise
 * is memoised and a microphone granted later must still be able to arm.
 */
export function startVoice(): Promise<void> {
  if (!voice) return Promise.resolve();
  started ??= voice
    .init()
    .then(() => {})
    .catch((error: unknown) => {
      // The mic still offers press-to-talk, which reports its own failure.
      console.warn("Voxide did not start", error);
    });
  return started;
}

/**
 * Starts listening locally for the wake phrase. Only ever called with the
 * microphone already granted: SpeechRecognition raises the browser's own
 * permission prompt, which would land on the child before anything on screen
 * had explained it.
 */
export function armWakeWord(): void {
  if (!voice) return;
  const client = voice;
  void startVoice().then(() => {
    // The dashboard's default is to arm; only an explicit false opts out.
    const autoArm = client.agentConfig?.wakeWord?.autoArm !== false;
    if (autoArm && client.isWakeWordAvailable()) client.armWakeWord();
  });
}

export function disarmWakeWord(): void {
  voice?.disarmWakeWord();
}
