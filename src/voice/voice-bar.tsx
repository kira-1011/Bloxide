import type { ReactNode } from "react";

/**
 * Asleep, listening, answering. Three states, one colour each.
 *
 * DESIGN.md gives the assistant purple and Run green, so an answer never wears
 * the colour of a running program.
 */
export type VoiceState = "asleep" | "listening" | "answering";

interface VoiceBarProps {
  readonly state: VoiceState;
  /** What the recogniser heard. Shown even when it was wrong, so it can be corrected. */
  readonly heard?: string | undefined;
  /** The assistant's one short sentence about what actually happened. */
  readonly answer?: string | undefined;
  readonly running: boolean;
  readonly onRun: () => void;
  readonly onStop: () => void;
}

const HEADING: Record<VoiceState, string> = {
  asleep: "Say “Hey Bloxide”",
  listening: "I am listening…",
  answering: "Here is what I did",
};

const ACCENT: Record<VoiceState, string> = {
  asleep: "bg-voice-asleep",
  listening: "bg-voice-listening",
  answering: "bg-voice-answering",
};

const HEADING_INK: Record<VoiceState, string> = {
  asleep: "text-ink-muted",
  listening: "text-voice-listening",
  answering: "text-voice-answering",
};

export function VoiceBar({ state, heard, answer, running, onRun, onStop }: VoiceBarProps) {
  return (
    <div className="flex h-[172px] shrink-0 items-center gap-6 border-t-[3px] border-blue-200 bg-surface px-7">
      <div
        className={`flex size-26 shrink-0 items-center justify-center rounded-full ${ACCENT[state]}`}
      >
        {state === "answering" ? <SpeechIcon /> : <MicIcon muted={state === "asleep"} />}
      </div>

      {/* aria-live, because the whole point is knowing you were heard. */}
      <div aria-live="polite" className="flex min-w-0 grow flex-col gap-2">
        <p className={`font-display text-[26px] font-bold ${HEADING_INK[state]}`}>
          {HEADING[state]}
        </p>

        {heard ? (
          <p className="flex items-center gap-3">
            <span className="shrink-0 text-base font-semibold text-ink-muted">I heard</span>
            <span className="grow rounded-full border border-slate-200 bg-slate-100 px-5 py-2.5 text-[22px] font-medium text-ink">
              {heard}
            </span>
          </p>
        ) : null}

        {answer ? <p className="text-lg font-semibold text-voice-answering">{answer}</p> : null}
      </div>

      <ActionButton
        label="Run program"
        onClick={onRun}
        disabled={running}
        className="bg-run text-white outline-run"
      >
        <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden="true">
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
        Run
      </ActionButton>

      <ActionButton
        label="Stop program"
        onClick={onStop}
        disabled={!running}
        className="bg-red-100 text-stop outline-stop"
      >
        <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="3" />
        </svg>
        Stop
      </ActionButton>
    </div>
  );
}

interface ActionButtonProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled: boolean;
  readonly className: string;
  readonly children: ReactNode;
}

/** Well past the 44px floor: DESIGN.md sets ours at 60px, and these are the
    two controls a child reaches for most. */
function ActionButton({ label, onClick, disabled, className, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-24 w-[180px] shrink-0 cursor-pointer items-center justify-center gap-3 rounded-action font-display text-3xl font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function MicIcon({ muted }: { readonly muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-11 stroke-white"
      fill="none"
      strokeWidth="2"
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

function SpeechIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-11 stroke-white"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
