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
4. **Small on purpose.** One stage, one sprite, ~15 blocks. A reliable small
   surface beats a broad unreliable one.

## Stack

- pnpm, Vite, React 18+, TypeScript
- oxlint + oxfmt (Oxc) for linting and formatting
- Vitest + Testing Library (jsdom) for tests
- Tailwind CSS (`@tailwindcss/vite`)
- `blockly` (core, direct)
- `@voxide/react` (voice)

## Blockly

- Import from `blockly/core`, `blockly/blocks`, `blockly/javascript`.
- Blockly is UMD, not ESM. If Vite complains, add
  `optimizeDeps: { include: ['blockly'] }`.
- Use `renderer: 'zelos'` — rounded, Scratch-like, familiar to children.
- Call `Blockly.setLocale()` at startup. `blockly/core` ships no messages, so
  `inject` throws reading an aria label without it.

**Do not install `react-blockly` or any wrapper.** It is unmaintained, has no
TypeScript typings, and abstracts the workspace behind props. Our capabilities
need direct access to the workspace object.

Mount Blockly once via `Blockly.inject()` in a `useEffect` with a ref. Keep the
`WorkspaceSvg` in a ref or context, never in React state. Dispose on unmount.
Blocks are not React components.

### Do not rebuild what Blockly has

Check its API before writing anything that inspects or changes a workspace.
Blockly already models this domain, and a second version of the same thing
drifts from it the moment either side gains a feature. What we lean on:

- `serialization.workspaces.save` / `.load` to persist a program, and
  `serialization.blocks.save(block, …)` to describe one — nesting, fields and
  all. Never hand-write a description of a workspace.
- `javascriptGenerator` to turn blocks into code, with `INFINITE_LOOP_TRAP` as
  the hook that makes a run interruptible.
- `block.select()` for the highlight, `block.dispose(true)` to heal the stack
  under a deleted block, `workspace.undo()` for undo.
- `workspace.getBlocksByType`, `getTopBlocks`, `getBlockById` to find blocks,
  and `connection.connect()` — which returns false rather than throwing — to
  join them.

Two exceptions, both because Blockly says so in its own docs:
`common.getMainWorkspace()` is discouraged, so we hold the workspace ourselves
in `src/blockly/activeWorkspace.ts`; and `common.setSelected()` is `@internal`,
so selection goes through `block.select()`.

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

Every action produces two things at once:

- **Visual** — the block appears and is briefly highlighted.
- **Spoken** — a short confirmation ("move block added, ten steps"). Not a
  paragraph.

The agent also reads the program through `bindState`, so it answers from what
is actually on the workspace rather than from what it believes it did.

## Conventions

- TypeScript strict. No `any`.
- Lint with **oxlint**, format with **oxfmt** (both from https://oxc.rs). Not
  ESLint, not Prettier — do not install either. Entry points: `pnpm lint`,
  `pnpm lint:fix`, `pnpm fmt`, `pnpm fmt:check`. Config lives in
  `.oxlintrc.json` and `.oxfmtrc.json`; oxfmt is Prettier-compatible and needs
  no options.
- **Always import through the `@` alias. Never `./` or `../`.** `@` maps to
  `src/` in both `vite.config.ts` and `tsconfig.json`, so `@/blockly/locale`
  reads the same from anywhere and survives a file move. A relative import in
  `src/` is a bug. The alias stops at `src/`, so the root config files are the
  one exception: `vitest.config.ts` imports `./vite.config.ts` relatively
  because no alias reaches outside `src/`.
- No barrel files. Import the module you mean — a barrel drags unrelated code
  into the bundle and hides what a file actually depends on.
- The Blockly editor integration lives in `src/blockly/`, voice capabilities in
  `src/voice/`, our own block definitions in `src/blocks/`.
- Small commits, conventional prefixes (`feat:`, `fix:`, `docs:`, `refactor:`,
  `chore:`, `test:`, `perf:`, `build:`, `ci:`).
- Never rewrite git history. No force-push, no squashing the initial commits.
  Amending a commit that has not been pushed is fine.
- **Never credit an AI agent as commit author or co-author.** No
  `Co-Authored-By:` trailer naming an agent, no "generated with" footer, in
  commit messages or PR bodies. The repository's git identity is the only
  author on the record.

## Code Comments

Write minimal comments. Code should be self-documenting.

- Comment only the non-obvious WHY (constraints, workarounds, invariants).
- Never restate WHAT the code does (e.g., avoid `// Create a new Map`).
- Keep docstrings on public APIs per language convention.
- Never remove existing human comments unless the code functionality changes.

## Skills

Four installed skills carry rules this project follows. Load the relevant one
before working in its area, not after.

- **`vercel-react-best-practices`** — before writing or changing any React
  code: components, hooks, data fetching, bundle boundaries. It is the
  authority for this codebase on lazy loading, effect dependencies, what
  belongs in a ref versus state, and re-render cost. The rules that keep coming
  up here: `advanced-use-latest` (`useEffectEvent`, so a caller's callback
  identity never re-runs an effect), `bundle-dynamic-imports` (Blockly is
  ~900 kB and loads as its own chunk), `advanced-init-once`, and
  `rendering-hoist-jsx`.
- **`improve-codebase-architecture`** — before any refactor, and whenever a
  module starts feeling shallow. Use its vocabulary exactly — module,
  interface, depth, seam, adapter, leverage, locality — and apply the deletion
  test: would removing this concentrate complexity, or just move it? "Just
  moves it" means delete. It found the barrel and the editor spread across
  three directories.
- **`changelog-generator`** — whenever `CHANGELOG.md` is updated. See Changelog
  below.
- **`typescript-advanced-types`** — before writing a type that is more than a
  shape: generics, conditional or mapped types, template literals, narrowing
  helpers, or anything derived from another type. See Type safety below.

All three are committed to the repo under `.agents/skills/`, so a clone has them
without anyone installing anything. `skills-lock.json` pins the versions. The
`.claude/skills/` symlinks are machine-local and gitignored — recreate them with
`npx skills install` if your agent reads from there.

To update a skill, re-run its install from the repo root and commit the diff:

```bash
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -y
npx skills add mattpocock/skills@improve-codebase-architecture -y
npx skills add https://github.com/composiohq/awesome-claude-skills --skill changelog-generator
npx skills add wshobson/agents --skill typescript-advanced-types
```

Prefer them over improvising a style: a rule from a skill beats a preference
argued in review.

## Type safety

**Types must hold end to end, from the data's source to where it is used.** A
type that stops at a module boundary is a type that lies at the next one.

- **Derive, never duplicate.** One list is the source: the toolbox defines the
  blocks, and `BlockType`, the agent's enum and the spoken vocabulary are all
  derived from it. A second hand-kept list drifts, and the drift is silent.
- **Parse at the boundary, then narrow.** Anything from outside the program —
  a model's tool call, `localStorage`, the network — arrives as `unknown` or
  `string` no matter what the signature claims. Validate it into a real type at
  the edge with a type guard, and let everything inside rely on the narrowed
  type. `addBlock` takes `string` and narrows through `resolveBlockType`
  precisely because a model can send anything.
- **A cast is a defect.** `as` and `as unknown as` silence the compiler without
  changing the value; reach for a guard, a `satisfies`, or a better shape
  instead. Where a third-party signature forces one, say why in a comment.
- **`as const satisfies`** keeps literal types while still checking the shape.
  It is what makes a config object usable as a type.
- No `any`. No `@ts-expect-error` without the reason on the line above.

## Changelog

`CHANGELOG.md` is the hackathon record: what shipped, when, in language a judge
or a teacher can read. Update it whenever work lands on `main`, not at the end.

Generate entries with the **`changelog-generator`** skill rather than writing
them by hand — it reads the git history so the record matches what actually
shipped:

```
Create a changelog entry for commits since <last entry date>
```

Then edit what it returns. It writes for a general software audience, and this
project has a narrower one:

- **Group by date, newest first.** One section per working day. This is a
  progress log, not a release history — there are no versions yet.
- **Say what a child can now do**, not what a module now contains. "Stop halts
  a running program" beats "added stopProgram to the runner".
- **Keep the accessibility reason visible** when a change has one. Why Run and
  Stop are not click handlers matters more than that they exist.
- **Skip internal noise.** Refactors, config, test plumbing and dependency
  bumps stay out unless a reader would notice the difference.
- **End with what is next**, and be honest about what is not built yet.

## Testing

Vitest, jsdom, Testing Library. Tests sit next to the code they cover as
`*.test.ts` / `*.test.tsx`. Test config lives in `vitest.config.ts`, which
merges `vite.config.ts` into itself — Vitest reads `vitest.config.ts` _instead
of_ the Vite config, so the merge is what keeps the `@` alias resolving in
tests. Keep app config in `vite.config.ts` and test config in the `test` block
of `vitest.config.ts`; neither file needs to repeat the other.

```bash
pnpm test           # vitest run — one pass, exits
pnpm test:watch     # interactive
pnpm test:coverage  # v8 coverage
```

**Always `pnpm test`, never bare `vitest`.** Watch mode never exits and will
hang an agent.

What is worth testing here:

- The seams we own. `useBlocklyWorkspace` is the adapter over Blockly's
  imperative API: it must inject once, tear down completely, and never
  re-inject over a child's program.
- Behaviour a reader would otherwise have to rediscover — that UI events do not
  fire `onChange`, that the locale installs before `inject`.
- Data against reality: toolbox entries are checked against Blockly's real
  block registry, because a typo'd type shows up as an empty category rather
  than an error.

Not Blockly's rendering. jsdom has no SVG geometry, so Blockly is mocked at the
module boundary in hook and component tests.

### Writing tests with an agent

From Vitest's own guidance (see Docs), plus what has bitten us:

- **Assert behaviour, not existence.** `toBeDefined()` as the only assertion on
  a value is not a test.
- **Do not over-mock.** Mock at the boundary with the outside world; mocking our
  own modules tests the mock. One `vi.mock` of a third party beats five of ours.
- **`vi.*`, never `jest.*`.** They are different libraries with similar names.
- **Mock with the `import()` form** — `vi.mock(import("@/blockly/locale"), …)`
  — not a string path. It is typo-proof and follows renames.
- **Ask for the hard cases explicitly**: unmount, double-mount under
  StrictMode, empty input, the failure branch. An agent left to itself writes
  the happy path.
- `restoreMocks` is on globally; do not rely on a mock implementation leaking
  from one test into the next.
- Keep test names short enough to scan in the runner's output.

## Branches

Conventional branch names, `<type>/<short-kebab-summary>`, the type matching
the commit prefix the work will carry:

```
feat/voice-add-block      fix/flyout-scroll-on-touch
refactor/blockly-module   chore/bump-blockly
docs/readme-setup         test/capability-handlers
```

Keep the summary two to four words. Branch from `main`, never from another
feature branch, and create it with `git worktree add` (see Worktrees). One
concern per branch — if the name needs an "and", it is two branches.

## Pull requests

- Title is the branch's conventional prefix plus what changed, in the
  imperative: `refactor: group the Blockly editor into one module`. No trailing
  full stop, no ticket noise.
- Body: what changed and **why**, then how it was verified. A few lines beats a
  wall of bullets. Call out anything a reviewer would otherwise have to
  discover — a moved file, a dropped dependency, a behaviour change.
- Keep it reviewable. A PR that mixes a refactor with a feature should have
  been two branches.

## Worktrees

**Always start new work in a new worktree.** Never `git checkout -b` in the
main checkout, and never `git stash` to move between pieces of work.

```bash
git worktree add ../bloxide-voice -b feat/voice-add-block
cd ../bloxide-voice && pnpm install
```

Why: `main` stays clean and runnable, so you can always check what shipped
without disturbing work in progress. Blockly's dev server and `node_modules`
are per-directory, so switching branches inside one checkout re-optimises
dependencies every time — two worktrees keep two dev servers alive on their own
ports instead.

`pnpm install` per worktree; `node_modules` is not shared. Copy `.env` across —
it is gitignored, so a fresh worktree has no Voxide key.

**Clean up as soon as the PR merges.** A stale worktree is a second copy of the
repo drifting out of date, and its branch blocks anyone from checking that
branch out elsewhere:

```bash
cd /path/to/main/checkout
git worktree remove ../bloxide-voice
rm -rf ../bloxide-voice              # remove leaves node_modules behind
git branch -d feat/voice-add-block   # local branch
git push origin --delete feat/voice-add-block
git pull
```

All five steps matter. `git worktree remove` deletes the tracked files and the
bookkeeping, but leaves any ignored ones — so the directory survives as a husk
of `node_modules`. It does not touch the local branch either, which otherwise
sits in `git branch` long after it merged.

Afterwards `git worktree list` should show only the main checkout, and `git
branch` only `main`. If a worktree directory was deleted by hand first, `git
worktree prune` clears the leftover bookkeeping. A branch can only be checked
out in one worktree at a time.

One gotcha: `gh pr merge` run from inside a worktree fails its local step with
`fatal: 'main' is already used by worktree at ...`. The merge on GitHub still
succeeds — it is only gh's attempt to switch the local branch afterwards that
fails. Check the PR state rather than the exit code.

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
- Vitest — https://vitest.dev
- Vitest config reference — https://vitest.dev/config/
- Writing tests with AI — https://vitest.dev/guide/learn/writing-tests-with-ai
- Testing Library (React) — https://testing-library.com/docs/react-testing-library/intro
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
