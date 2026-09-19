import type { OutputLine } from "@/run/runner";

interface OutputPanelProps {
  readonly output: readonly OutputLine[];
  readonly error: string | null;
}

export function OutputPanel({ output, error }: OutputPanelProps) {
  if (output.length === 0 && !error) return null;

  return (
    // aria-live: output is spoken feedback too, not just visual.
    <div
      aria-live="polite"
      aria-label="Program output"
      className="max-h-40 overflow-y-auto border-t border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm"
    >
      {output.map((line) => (
        <p key={line.id} className="text-slate-700">
          {line.text}
        </p>
      ))}
      {error ? <p className="text-rose-700">{error}</p> : null}
    </div>
  );
}
