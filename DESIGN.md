# DESIGN.md

The design system for Bloxide. Read this before changing anything a child sees.

`AGENTS.md` governs how we build. This governs how it looks and behaves.

## Who this is for

Children aged 8 to 12 who can speak clearly but cannot use a mouse: cerebral
palsy, muscular dystrophy, limb difference and similar. They work one to one
with an adult in a quiet room. Many can point slowly and imprecisely, but none
can drag.

Two consequences run through every rule below:

- **Voice is the input, the screen is the output.** The screen never asks to be
  touched. It reports.
- **A pointer, if it exists, is slow and inaccurate.** Anything tappable is
  large, spaced, and never moves.

## Principles

1. **Recognition over recall.** The palette shows every block the child may
   ask for, always. Nothing is hidden behind a category, a menu or a mode.
2. **Nothing moves.** A control that relocates cannot be aimed at. The palette,
   the voice bar and the sprite stay where they are, in every state.
3. **One sentence, one action.** Speech recognition accuracy collapses on
   compound commands: 96.9% simple against 68.8% complex in the ITiCSE 2026
   evaluation. Short commands are an accuracy decision, not a style choice.
4. **Every action answers three ways.** The block changes on screen, the
   assistant says what happened, and the affected block is highlighted.
5. **Never claim what did not happen.** Confirmations are read back out of the
   workspace after the change, never composed from what was asked.
6. **Colour is never the only signal.** Every category carries a name and a
   dot. Every state carries words.

## Colour

Semantic tokens. Components reference the token, never the hex.

| Token                    | Hex       | Used for                   |
| ------------------------ | --------- | -------------------------- |
| `--color-bg`             | `#EFF6FF` | App background             |
| `--color-surface`        | `#FFFFFF` | Panels, palette, voice bar |
| `--color-surface-sunken` | `#F8FAFC` | Category rail, block rows  |
| `--color-ink`            | `#0F172A` | Primary text               |
| `--color-ink-muted`      | `#64748B` | Labels, secondary text     |
| `--color-border`         | `#DBEAFE` | Panel edges                |
| `--color-stage`          | `#E0F2FE` | Sprite stage fill          |
| `--color-stage-border`   | `#BAE6FD` | Sprite stage edge          |

### Block categories

Each category owns one fill. White text sits on all of them at 4.5:1 or better.

| Category | Token                  | Hex       | Blocks                                          |
| -------- | ---------------------- | --------- | ----------------------------------------------- |
| Movement | `--color-cat-movement` | `#1D4ED8` | move, turn right, turn left, go to x y          |
| Say      | `--color-cat-say`      | `#A21CAF` | say for secs, say                               |
| Look     | `--color-cat-look`     | `#0E7490` | change size by, hide, show                      |
| Control  | `--color-cat-control`  | `#C2410C` | wait, repeat, forever, repeat until, wait until |

### Voice states

Three states, one colour each, never more.

| State     | Token                     | Hex       | Meaning                                   |
| --------- | ------------------------- | --------- | ----------------------------------------- |
| Asleep    | `--color-voice-asleep`    | `#CBD5E1` | Not recording. Waiting for the wake word. |
| Listening | `--color-voice-listening` | `#2563EB` | Recording. Live transcript visible.       |
| Answering | `--color-voice-answering` | `#7C3AED` | The assistant is reporting or asking.     |

### Actions

| Token               | Hex       | Used for                                    |
| ------------------- | --------- | ------------------------------------------- |
| `--color-run`       | `#047857` | Run                                         |
| `--color-stop`      | `#B91C1C` | Stop                                        |
| `--color-highlight` | `#FDE68A` | Ring on the block the last sentence touched |

Purple belongs to the assistant. Do not use it for a block category.
Green belongs to Run. Do not use it for confirmations, or a child reads a
successful sentence as a running program.

## Typography

| Face    | Where                                      | Why                                                                     |
| ------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Lexend  | UI text, labels, transcript                | Designed to improve reading proficiency                                 |
| Baloo 2 | Block text, headings, spoken confirmations | Rounded, high stroke contrast, reads as friendly without being childish |

Never Comic Sans or Comic Neue. The typeface choice is an accessibility
decision and should be defensible as one.

### Scale

| Role                | Size | Weight              |
| ------------------- | ---- | ------------------- |
| Block text, canvas  | 27px | 600                 |
| Voice state heading | 26px | 700                 |
| Heard transcript    | 22px | 500                 |
| Assistant answer    | 18px | 600                 |
| Panel heading       | 24px | 700                 |
| Palette block       | 14px | 600                 |
| Category label      | 11px | 700, 0.7px tracking |

Body text never goes below 14px, and never below 18px for anything the child
is expected to read while speaking.

## Space and size

- Spacing follows a 4px rhythm.
- **Touch targets are 60px or larger.** The usual 44px floor assumes typical
  motor control. Ours does not.
- Targets are separated by at least 8px.
- Radii: 999px pills, 28px large buttons, 24px panels, 16px canvas blocks,
  9px palette blocks.

## Layout

Four fixed zones. This arrangement does not change between building and
running.

```
+----------------------------------------------------------+
| Header: logo                                             |
+---------+--------------------------------+---------------+
| Palette | Blocks                         | Sprite        |
| rail +  | numbered, highlighted          | stage, speech |
| list    |                                | bubble        |
+---------+--------------------------------+---------------+
| Voice bar: state, mic, transcript, answer, Run, Stop     |
+----------------------------------------------------------+
```

- **Palette** is 348px: a 72px category rail plus the scrolling block list. The
  rail indicates position, it does not filter. Saying "scroll to the movement
  blocks" scrolls and highlights; it never hides the rest.
- **Blocks** carry a permanent number badge. Numbers come from what is drawn on
  screen, so the badge and the assistant can never disagree.
- **Sprite** fills its column and speaks in a bubble. There is no separate
  output panel; `say` renders where the child is already looking.
- **Voice bar** is the tallest fixed element on the page, because knowing
  whether you were heard matters more than any single control.

## Voice feedback

Every utterance produces, in this order: the workspace changes, the block
highlights, the assistant speaks one short sentence, the same sentence appears
in the voice bar.

Rules:

- **Confirm with the fact, not the request.** "Added a say block. It is block
  4." Read the value back out of the block after setting it.
- **Ask only for the missing piece.** Heard "make it steps" with no number, ask
  "How many steps?" Never "please repeat that".
- **Say when nothing changed.** A scroll or a failed match states that the
  program is untouched, or the child reads silence as a broken command.
- **One sentence.** Not a paragraph.

## What not to do

- No block, button or affordance that only a click can reach.
- No `dangerous: true` on a Voxide action. It demands a click to confirm.
- No hat block that names a mouse. A program runs top to bottom when the child
  says "run the program".
- No mode that hides blocks the child might ask for.
- No emoji as icons. Inline stroke SVG only.
- No motion that cannot be interrupted, and none at all under
  `prefers-reduced-motion`.
- No colour-only meaning anywhere.

## Known gaps

- `repeat until` and `wait until` show an empty hexagon and no block in the set
  fills it. Deliberate for now; a sensing block closes it later.
- Microphone permission has no home in the UI, so a denied permission cannot be
  explained to the child.
- None of this has been tested with a child. Sizes, phrasings and whether an
  8 year old ever says "scroll to the movement blocks" are assumptions.

## Tokens

Tailwind v4 reads its theme from CSS. Add to `src/index.css`:

```css
@theme {
  --color-bg: #eff6ff;
  --color-surface: #ffffff;
  --color-surface-sunken: #f8fafc;
  --color-ink: #0f172a;
  --color-ink-muted: #64748b;
  --color-border: #dbeafe;
  --color-stage: #e0f2fe;
  --color-stage-border: #bae6fd;

  --color-cat-movement: #1d4ed8;
  --color-cat-say: #a21caf;
  --color-cat-look: #0e7490;
  --color-cat-control: #c2410c;

  --color-voice-asleep: #cbd5e1;
  --color-voice-listening: #2563eb;
  --color-voice-answering: #7c3aed;

  --color-run: #047857;
  --color-stop: #b91c1c;
  --color-highlight: #fde68a;

  --font-display: "Baloo 2", cursive;
  --font-sans: "Lexend", system-ui, sans-serif;

  --radius-block: 16px;
  --radius-panel: 24px;
  --radius-action: 28px;

  --spacing-target: 60px;
}
```

## Sources

- Goller, Fraser and Graßl, _Voice-Controlled Scratch for Children with (Motor)
  Disabilities_, ITiCSE 2026, arXiv 2603.28246. Command accuracy by complexity,
  numeric overlays, and the absence of voice output in their prototype.
- Milne and Ladner, _Blocks4All_. Select and drop over drag and drop, fixed
  block positions, audio cues for nesting.
- Scratch 3.0 interface research. Palette left, stage right, and the move from
  per category flyouts to one continuous scrolling list.
