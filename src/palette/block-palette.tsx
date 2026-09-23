import { useRef, useState } from "react";
import { hasActiveWorkspace } from "@/blockly/active-workspace";
import { blocksIn, CATEGORIES, type CategoryId, type PaletteBlock } from "@/palette/catalogue";
import { addBlock } from "@/voice/handlers";

/**
 * Every block the child may ask for, always on screen.
 *
 * The rail scrolls the list to a category and marks where you are. It does not
 * filter: hiding blocks would turn recognition into recall, and a misheard
 * category would silently change what the child thinks they can say.
 */
export function BlockPalette() {
  const [current, setCurrent] = useState<CategoryId>("movement");
  const headings = useRef(new Map<CategoryId, HTMLHeadingElement>());
  const [said, setSaid] = useState("");

  const jumpTo = (id: CategoryId) => {
    setCurrent(id);
    headings.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // The same path the voice command takes, so a block placed by hand is
  // numbered, selected and confirmed exactly like one placed by speaking.
  const place = (type: string) => {
    if (!hasActiveWorkspace()) return;
    setSaid(addBlock({ type }));
  };

  return (
    <div className="flex w-[348px] shrink-0 border-r border-edge bg-surface">
      <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 border-r border-slate-200 bg-surface-sunken py-3">
        {CATEGORIES.map((category) => {
          const active = category.id === current;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => jumpTo(category.id)}
              aria-label={`Scroll to the ${category.label} blocks`}
              aria-current={active ? "true" : undefined}
              className={`flex w-[60px] cursor-pointer flex-col items-center gap-1 rounded-2xl py-2 ${
                active ? "bg-bg" : "bg-transparent"
              }`}
            >
              <span
                className={`size-8 rounded-full ${category.fill} ${
                  active ? "ring-2 ring-white ring-offset-2 ring-offset-current" : ""
                }`}
              />
              <span
                className={`text-[10px] font-bold tracking-wide ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                {category.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 grow flex-col gap-1 overflow-y-auto py-3 pr-3 pl-3.5">
        {CATEGORIES.map((category) => (
          <section key={category.id} className="flex flex-col gap-1">
            <h2
              ref={(node) => {
                if (node) headings.current.set(category.id, node);
                else headings.current.delete(category.id);
              }}
              className="flex items-center gap-1.5 pt-1.5 text-[11px] font-bold tracking-wide text-ink-muted"
            >
              <span className={`size-2.5 rounded ${category.fill}`} aria-hidden="true" />
              {category.label.toUpperCase()}
            </h2>
            {blocksIn(category.id).map((block) => (
              <PaletteBlockRow key={block.id} block={block} fill={category.fill} onPlace={place} />
            ))}
          </section>
        ))}
      </div>

      <output className="sr-only">{said}</output>
    </div>
  );
}

interface PaletteBlockRowProps {
  readonly block: PaletteBlock;
  readonly fill: string;
  readonly onPlace: (type: string) => void;
}

/** Voice reaches every block; this keeps keyboard and pointer reaching them too. */
function PaletteBlockRow({ block, fill, onPlace }: PaletteBlockRowProps) {
  return (
    <button
      type="button"
      onClick={() => onPlace(block.id)}
      // Spelled out because the parts are separate spans, which an accessible
      // name would run together into "move10steps".
      aria-label={`Add ${block.parts.map((part) => ("word" in part ? part.word : part.slot)).join(" ")}`}
      className={`flex cursor-pointer items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-left font-display text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${fill}`}
    >
      {block.parts.map((part) =>
        "word" in part ? (
          <span key={part.key}>{part.word}</span>
        ) : (
          <span
            key={part.key}
            className={
              part.slot
                ? "rounded-full bg-white px-2 py-px text-[13px] font-bold text-ink"
                : "rounded-[5px] bg-black/25 px-4.5 py-0.5"
            }
          >
            {part.slot}
          </span>
        ),
      )}
    </button>
  );
}
