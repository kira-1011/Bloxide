import { useEffect, useRef } from "react";
import { useVoxideVoice, type VoxideClient } from "@voxide/react";
import { lastLine, voiceStateOf, type VoiceState } from "@/voice/voice-state";

interface Look {
  readonly button: string;
  readonly title: string;
}

// One colour per state, in the same place every time, so the child never has
// to ask whether they are being heard.
const LOOKS: Record<VoiceState, Look> = {
  asleep: { button: "bg-voice-asleep", title: "text-voice-asleep-ink" },
  listening: {
    button: "bg-voice-listening ring-[12px] ring-voice-listening/18",
    title: "text-voice-listening-ink",
  },
  answering: {
    button: "bg-voice-answering ring-[12px] ring-voice-answering/16",
    title: "text-voice-answering-ink",
  },
};

const BAR_HEIGHTS = [22, 44, 56, 34, 16] as const;

interface VoiceMicProps {
  readonly client: VoxideClient;
}

/**
 * The mic, what it heard, and what it answered.
 *
 * Driven by Voxide's live session state rather than its widget, so it can sit
 * inline in the voice bar at a size a child who cannot aim can still find.
 */
export function VoiceMic({ client }: VoiceMicProps) {
  const session = useVoxideVoice(client);
  const state = voiceStateOf(session.status);
  const heard = lastLine(session.messages, "user");
  const reply = lastLine(session.messages, "ai");
  const awake = state !== "asleep";

  const toggle = () => {
    if (awake) session.disconnect();
    else void session.connect();
  };

  return (
    <div className="flex min-w-0 grow items-center gap-6">
      <button
        type="button"
        onClick={toggle}
        aria-label={awake ? "Stop listening" : "Start listening"}
        className={`flex size-26 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-4 focus-visible:outline-offset-8 focus-visible:outline-ink ${LOOKS[state].button}`}
      >
        {state === "answering" ? <ReplyIcon /> : <MicIcon muted={state === "asleep"} />}
      </button>

      {state === "listening" ? <InputLevel getLevel={session.getInputLevel} /> : null}

      <div className="flex min-w-0 grow flex-col gap-2">
        <p className={`font-display text-[26px] leading-tight font-bold ${LOOKS[state].title}`}>
          {titleFor(state, session)}
        </p>
        {heard ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 font-semibold text-ink-muted">I heard</span>
            <p className="min-w-0 grow truncate rounded-full border border-slate-200 bg-slate-100 px-5 py-2 text-[22px] font-medium">
              “{heard}”
            </p>
          </div>
        ) : null}
        {reply ? (
          <p className="flex min-w-0 items-center gap-2 text-lg font-semibold text-voice-answering-ink">
            <ReplyIcon small />
            <span className="truncate">{reply}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function titleFor(state: VoiceState, session: ReturnType<typeof useVoxideVoice>): string {
  if (state === "listening") {
    return session.status === "connecting" ? "Getting ready…" : "I am listening…";
  }
  if (state === "answering") return "Answering…";
  if (session.status === "error") return "I could not hear you. Press the mic to try again.";
  if (session.wakeArmed && session.wakePhrase) return `Say “${session.wakePhrase}”`;
  return "Press the mic to talk";
}

interface InputLevelProps {
  readonly getLevel: () => number;
}

/**
 * The bars move with the child's voice. The level is polled rather than held
 * in state, as the SDK asks, so a frame never re-renders React.
 */
function InputLevel({ getLevel }: InputLevelProps) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const tick = () => {
      const level = Math.min(1, getLevel() * 4);
      bars.current.forEach((bar, index) => {
        if (bar) bar.style.transform = `scaleY(${0.3 + 0.7 * level * (index % 2 ? 1 : 0.8)})`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return (
    <div aria-hidden="true" className="flex h-14 shrink-0 items-end gap-1.5">
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={height}
          ref={(node) => {
            bars.current[index] = node;
          }}
          className="w-2 origin-bottom rounded bg-voice-listening"
          style={{ height }}
        />
      ))}
    </div>
  );
}

function MicIcon({ muted }: { readonly muted: boolean }) {
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
      {muted ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}

function ReplyIcon({ small = false }: { readonly small?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 fill-none stroke-2 ${small ? "size-5 stroke-current" : "size-11.5 stroke-white"}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
