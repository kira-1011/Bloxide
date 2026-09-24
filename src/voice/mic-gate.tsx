import { useEffect, type ReactNode } from "react";
import { useStore } from "zustand";
import { isWakeWordSupported } from "@voxide/react";
import {
  askForMic,
  checkMicPermission,
  micPermissionStore,
  watchMicPermission,
  type MicPermission,
} from "@/voice/mic-permission";

type Blocked = Exclude<MicPermission, "granted" | "unknown">;

interface Notice {
  readonly title: string;
  /** Null where pressing again cannot help, so no button is offered. */
  readonly action: string | null;
}

const NOTICES = {
  ask: { title: "Bloxide needs to hear you", action: "Turn on my microphone" },
  asking: { title: "Choose Allow", action: null },
  denied: { title: "My microphone is blocked", action: "I fixed it" },
  "no-mic": { title: "I cannot find a microphone", action: "Try again" },
  unsupported: { title: "This browser cannot hear you", action: null },
} as const satisfies Record<Blocked, Notice>;

function bodyFor(permission: Blocked): string {
  if (permission === "ask") {
    // Feature-detected, because the wake word is Chrome and Edge only and a
    // child told to say "Hey Bloxide" in Firefox waits forever.
    return isWakeWordSupported()
      ? "Press the big button, then choose Allow. After that you can just talk to me."
      : "Press the big button, then choose Allow. After that, press the mic to talk.";
  }
  if (permission === "asking") return "Your browser is asking. Choose Allow so I can hear you.";
  if (permission === "denied") {
    return "Ask a grown-up to press the icon next to the web address, find Microphone and choose Allow. Then press the big button.";
  }
  if (permission === "no-mic") {
    return "Ask a grown-up to plug one in, or turn it on. Then press the big button.";
  }
  return "Ask a grown-up to open Bloxide in Chrome or Edge.";
}

interface MicGateProps {
  readonly children: ReactNode;
}

/**
 * Stands where the mic stands until the microphone is ours. Voice is the only
 * input our user has, so a blocked microphone is a dead end unless the screen
 * says so and says what to do about it.
 */
export function MicGate({ children }: MicGateProps) {
  const { permission } = useStore(micPermissionStore);

  useEffect(() => watchMicPermission(), []);

  if (permission === "granted") return children;
  // Still reading the browser: say nothing rather than flash the wrong thing.
  if (permission === "unknown") return <div className="grow" />;

  const { title, action } = NOTICES[permission];
  // A denied permission never prompts again, so the way back is the browser's
  // own setting; all we can do is look again.
  const retry = permission === "denied" ? checkMicPermission : askForMic;

  return (
    <div className="flex min-w-0 grow items-center gap-6">
      {action ? (
        <button
          type="button"
          onClick={() => void retry()}
          aria-label={action}
          className="flex size-26 shrink-0 cursor-pointer items-center justify-center rounded-full bg-voice-asleep transition-colors hover:bg-slate-400 focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-ink"
        >
          <BlockedMicIcon />
        </button>
      ) : (
        <div
          aria-hidden="true"
          className="flex size-26 shrink-0 items-center justify-center rounded-full bg-voice-asleep"
        >
          <BlockedMicIcon />
        </div>
      )}

      <output className="flex min-w-0 grow flex-col gap-1.5">
        <p className="font-display text-[26px] leading-tight font-bold text-voice-asleep-ink">
          {title}
        </p>
        <p className="text-lg font-medium text-ink">{bodyFor(permission)}</p>
        {action ? <p className="text-lg font-semibold text-brand">{action}</p> : null}
      </output>
    </div>
  );
}

function BlockedMicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-11.5 fill-none stroke-white stroke-2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}
