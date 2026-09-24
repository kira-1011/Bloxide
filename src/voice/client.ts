import { VoxideClient } from "@voxide/react";
import { describeProgram } from "@/voice/program-state";
import { VOICE_ACTIONS } from "@/voice/handlers";
import { checkMicPermission } from "@/voice/mic-permission";

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
 * Bumped by every arm and every disarm. An arm waiting on init compares it on
 * the way out, so a disarm that happened meanwhile cannot be undone by a
 * callback that was already in flight.
 */
let wakeGeneration = 0;

/**
 * Starts listening locally for the wake phrase.
 *
 * This is the only path in the app that can reach the microphone without the
 * child asking, because SpeechRecognition raises the browser's own permission
 * prompt. So the permission is read again here, at the moment of arming,
 * rather than trusted from whenever the caller decided: between the two, init
 * may have been in flight for seconds and the permission may have been
 * revoked, or the caller's value may simply be a cached grant from before a
 * remount.
 */
export function armWakeWord(): void {
  if (!voice) return;
  const client = voice;
  const generation = ++wakeGeneration;
  void startVoice()
    // Read after init, not beside it: init can be in flight for seconds, and
    // a permission read that started before it says nothing about now.
    .then(checkMicPermission)
    .then((permission) => {
      if (generation !== wakeGeneration || permission !== "granted") return;
      // The dashboard's default is to arm; only an explicit false opts out.
      const autoArm = client.agentConfig?.wakeWord?.autoArm !== false;
      if (autoArm && client.isWakeWordAvailable()) client.armWakeWord();
    });
}

/**
 * Also clears the SDK's own memory that it was armed, so a live session that
 * ends later does not silently re-arm against a microphone we have just been
 * told to let go of.
 */
export function disarmWakeWord(): void {
  wakeGeneration += 1;
  voice?.disarmWakeWord();
}
