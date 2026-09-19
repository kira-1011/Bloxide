interface SpriteStageProps {
  /** What the sprite is saying, drawn as a bubble. Nothing means silence. */
  readonly saying?: string | undefined;
}

/**
 * Where the child watches their program happen.
 *
 * A placeholder: the sprite is fixed art and nothing moves it yet. The real
 * sprite arrives with the Bloxide blocks, which need something to act on.
 *
 * `say` speaks in a bubble here rather than in a separate output panel,
 * because the child is already looking at the sprite.
 */
export function SpriteStage({ saying }: SpriteStageProps) {
  return (
    <div className="flex w-[330px] shrink-0 flex-col gap-3.5 border-l border-edge bg-surface p-5">
      <h2 className="font-display text-2xl font-bold text-ink">Your sprite</h2>

      <div className="relative flex grow items-center justify-center rounded-panel border-[3px] border-stage-edge bg-stage">
        <svg viewBox="0 0 120 120" className="size-48" fill="none" aria-label="Your sprite">
          <path d="M30 34 L38 14 L52 30 Z" fill="#f59e0b" />
          <path d="M90 34 L82 14 L68 30 Z" fill="#f59e0b" />
          <ellipse cx="60" cy="66" rx="42" ry="38" fill="#f59e0b" />
          <circle cx="47" cy="60" r="7" fill="#0f172a" />
          <circle cx="73" cy="60" r="7" fill="#0f172a" />
          <path
            d="M46 80 Q60 92 74 80"
            stroke="#0f172a"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {saying ? (
          <p className="absolute top-13 right-6 rounded-[22px] border-[3px] border-slate-300 bg-surface px-5 py-3 font-display text-[28px] font-bold text-ink">
            {saying}
          </p>
        ) : null}
      </div>
    </div>
  );
}
