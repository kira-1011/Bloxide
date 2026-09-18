interface RunControlsProps {
  readonly running: boolean;
  readonly onRun: () => void;
  readonly onStop: () => void;
}

const BUTTON =
  "inline-flex items-center gap-2 rounded-full px-6 py-3 text-lg font-semibold text-white " +
  "shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export function RunControls({ running, onRun, onStop }: RunControlsProps) {
  return (
    // Large targets: limited motor control needs room to aim.
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onRun}
        disabled={running}
        aria-label="Run program"
        className={`${BUTTON} bg-emerald-600 outline-emerald-600 hover:bg-emerald-700`}
      >
        <span aria-hidden="true">▶</span>
        Run
      </button>

      <button
        type="button"
        onClick={onStop}
        disabled={!running}
        aria-label="Stop program"
        className={`${BUTTON} bg-rose-600 outline-rose-600 hover:bg-rose-700`}
      >
        <span aria-hidden="true">■</span>
        Stop
      </button>

      <output className="text-sm text-slate-500">{running ? "Running…" : ""}</output>
    </div>
  );
}
