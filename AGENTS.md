# AGENTS.md

## What this is

Bloxide is a block programming environment for children who cannot use a mouse.

Every action — placing a block, connecting it, changing a value, running the
program — is done by speaking. The screen is output; the voice is input.

Block programming is how most children meet code, but drag-and-drop requires
fine motor control that children with cerebral palsy, muscular dystrophy, limb
difference and similar conditions do not have. No maintained tool closes this
gap (Goller, Fraser & Graßl, ITiCSE 2026, arXiv 2603.28246).

## Hard constraints

These are product decisions, not preferences. Do not relax them.

1. **The child authors every block.** There is no "build me a game" capability
   and no high-level generation. The agent places one block, makes one
   connection, or sets one value per utterance. It never plans ahead, never
   suggests the next block, and never silently fixes a bug.
2. **Never use `dangerous: true` on a Voxide action.** It pauses and requires a
   _click_ to confirm. Our users may not be able to click. Confirm by voice
   instead.
3. **No mouse-only paths.** If an action can only be done by clicking, it is a
   bug. Keyboard and pointer input stay available, but voice must reach
   everything.
4. **Localisation from the first commit.** All block labels and spoken strings
   come from locale files. English, Amharic (am), Afaan Oromo (om).
5. **Small on purpose.** One stage, one sprite, ~15 blocks. A reliable small
   surface beats a broad unreliable one.

## Stack

- pnpm, Vite, React 18+, TypeScript
- oxlint + oxfmt (Oxc) for linting and formatting
- Tailwind CSS (`@tailwindcss/vite`)
- `blockly` (core, direct)
- `@voxide/react` (voice)

## Blockly

- Import from `blockly/core`, `blockly/blocks`, `blockly/javascript`.
- Blockly is UMD, not ESM. If Vite complains, add
  `optimizeDeps: { include: ['blockly'] }`.
- Use `renderer: 'zelos'` — rounded, Scratch-like, familiar to children.
- Call `Blockly.setLocale()` at startup. This is the i18n hook.

**Do not install `react-blockly` or any wrapper.** It is unmaintained, has no
TypeScript typings, and abstracts the workspace behind props. Our capabilities
need direct access to the workspace object.

Mount Blockly once via `Blockly.inject()` in a `useEffect` with a ref. Keep the
`WorkspaceSvg` in a ref or context, never in React state. Dispose on unmount.
Blocks are not React components.

## Voxide

- Register capabilities with `ai.register({ name: { description, params, handler } })`.
- Handlers call the Blockly API directly. No synthetic mouse events, ever.
- Bind live state (`bindState`) so the agent can read the current program.
- Wake word is configured in the Voxide dashboard, not in code. Feature-detect
  with `isWakeWordSupported()` before showing any listening affordance.
- Chrome and Edge only for wake word. Degrade to click-to-talk elsewhere.

## Block reference

The child cannot point, so they need a way to say "that block". Three layers,
in priority order:

1. **Implicit** — the block just created stays the target ("make it ten steps").
2. **Positional** — "the second repeat", "the last one".
3. **Numeric overlay** — every block numbered, always available as fallback.

Implicit is the default. Numbers are the floor that keeps a misrecognition from
dead-ending.

## Feedback

Every action produces three things at once:

- **Visual** — the block appears and is briefly highlighted.
- **Spoken** — a short confirmation ("move block added, ten steps"). Not a
  paragraph.
- **State** — `readProgram` speaks the whole script aloud on request.

## Conventions

- TypeScript strict. No `any`.
- Lint with **oxlint**, format with **oxfmt** (both from https://oxc.rs). Not
  ESLint, not Prettier — do not install either. Entry points: `pnpm lint`,
  `pnpm lint:fix`, `pnpm fmt`, `pnpm fmt:check`. Config lives in
  `.oxlintrc.json` and `.oxfmtrc.json`; oxfmt is Prettier-compatible and needs
  no options.
- Voice capabilities live in `src/voice/`, block definitions in `src/blocks/`,
  locales in `src/locales/`.
- Small commits, conventional prefixes (`feat:`, `fix:`, `docs:`).
- Never rewrite git history. No force-push, no squashing the initial commits.

## Out of scope

- Severe dysarthria. ASR word error rates run 30–60% there; a browser SDK
  cannot fix acoustic modelling. Primary user is motor impairment with intact
  speech.
- Forking Scratch. Its VM is driven by drag-and-drop UI events, which is the
  coupling we are avoiding.
- Telephony, accounts, multiplayer, cloud save.

## Docs

Check these before guessing an API. Prefer them over training memory — Blockly
moved to the Raspberry Pi Foundation and Voxide is new, so both are likely
newer than any model's knowledge.

### Voxide
- https://voxide.app/llms.txt

### Blockly

Now maintained by the Raspberry Pi Foundation, supported by Google.

- Docs home — https://docs.blockly.com
- Get the code — https://docs.blockly.com/guides/get-started/get-the-code/
- Using the APIs — https://docs.blockly.com/guides/programming/using_blockly_apis
- Editor configuration — https://docs.blockly.com/guides/configure/configuration_struct
- Custom blocks — https://docs.blockly.com/guides/create-custom-blocks/overview
- Running generated code — https://docs.blockly.com/guides/app-integration/run-code
- API reference — https://docs.blockly.com/reference
- Codelabs — https://docs.blockly.com/codelabs
- Samples — https://raspberrypifoundation.github.io/blockly-samples/
- Accessibility — https://blockly.com/accessibility
- Accessibility projects — https://blockly.com/accessibility-projects
- Repo — https://github.com/RaspberryPiFoundation/blockly

### Stack

- pnpm — https://pnpm.io
- Vite — https://vite.dev
- React — https://react.dev
- TypeScript — https://www.typescriptlang.org/docs/
- Tailwind CSS — https://tailwindcss.com/docs
- Tailwind + Vite setup — https://tailwindcss.com/docs/installation/using-vite
- Oxc (oxlint, oxfmt) — https://oxc.rs
- oxlint — https://oxc.rs/docs/guide/usage/linter.html
- oxlint config reference —
  https://oxc.rs/docs/guide/usage/linter/config-file-reference.html
- oxfmt — https://oxc.rs/docs/guide/usage/formatter.html

### Research

- Anchor paper (Goller, Fraser & Graßl, ITiCSE 2026) — https://arxiv.org/abs/2603.28246
- Accessibility barriers literature review (2026) — https://link.springer.com/article/10.1007/s10209-026-01351-6
- ScholarXIV developer docs — https://scholarxiv.com/developers/docs
- Ideation trail (ScholarXIV collection) —
  https://www.scholarxiv.com/collections/share/20668bcf184466af0c88a55fc256ad93635c32032365a97cc437a9344c0534e7
