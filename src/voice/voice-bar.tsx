import type { ReactNode } from "react";

interface VoiceBarProps {
  readonly running: boolean;
  /** A program that failed. The child is told here rather than in a console. */
  readonly error?: string | undefined;
  readonly onRun: () => void;
  readonly onStop: () => void;
}

/**
 * The fixed strip along the bottom of the editor.
 *
 * Voxide's own widget owns the mic, the waveform, the transcript and the
 * listening states, and its appearance is set in the dashboard; a second set
 * here would only drift from the SDK. What this bar contributes is the one
 * thing the widget cannot: a place that never moves, large enough for a child
 * who cannot aim, plus the two program controls.
 */
export function VoiceBar({ running, error, onRun, onStop }: VoiceBarProps) {
  return (
    <div className="flex h-36 shrink-0 items-center gap-6 border-t-[3px] border-blue-200 bg-surface px-7">
      {/* The inline Voxide widget sits here. It mounts at the app root so a
          call survives navigation, so this bar renders nothing for it. */}
      <div aria-live="polite" className="flex min-w-0 grow flex-col gap-2">
        {running ? (
          <p className="font-display text-2xl font-bold text-run">Running your program…</p>
        ) : null}
        {error ? <p className="text-lg font-semibold text-stop">{error}</p> : null}
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
