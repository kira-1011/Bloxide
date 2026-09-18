# Bloxide

A block programming environment that children control by speaking.

## The problem

Block programming is how most children meet code for the first time. You drag
a block, snap it under another one, change a number, press play.

All of that needs a mouse. Children with cerebral palsy, muscular dystrophy,
limb difference and similar conditions often cannot do it, so they get left out
of the lesson.

Most accessibility work on block programming has focused on blind and low
vision users, which solves a different problem. A 2026 paper looked for a
maintained tool that lets motor impaired children use Scratch by voice and did
not find one. The older attempts have stopped being maintained or only cover
part of the editor.

Bloxide is our attempt at that gap.

## How it works

The child speaks. Each sentence does one thing.

```
"Add a when flag clicked block."   -> block appears
"Add a repeat block under it."     -> snaps below
"Make it four times."              -> value updates
"Put a move block inside it."      -> nests in the loop
"Make it fifty steps."             -> value updates
"Run it."                          -> the sprite moves
```

Every action gives feedback three ways. The block appears and is highlighted,
the app says what it did, and the child can ask "read my program" at any point
to hear the whole script back.

Saying "that block" works three ways, in order: the block just created stays
the target, so "make it ten steps" needs no reference at all; failing that,
position ("the second repeat", "the last one"); and every block carries a
number on screen as the fallback that keeps a misheard word from dead-ending.

The agent only places blocks. It does not write programs. If you say "make me a
game" it will not build one, because the point is that the child is the author.

## Status

Early. A drag and drop Blockly workspace is up with a starter toolbox; the
Bloxide blocks and the whole voice layer are still to come.

## Stack

- React, TypeScript, Vite
- Tailwind CSS
- [Blockly](https://docs.blockly.com) for the block editor
- [Voxide](https://voxide.app/docs) for voice
- [oxlint and oxfmt](https://oxc.rs) for linting and formatting

## Running it locally

You need pnpm and Node `^20.19` or `>=22.12`.

```bash
git clone https://github.com/kira-1011/Bloxide.git
cd Bloxide
pnpm install
cp .env.example .env
```

Put your Voxide publishable key in `.env` as `VITE_VOXIDE_PUBLIC_KEY`. You can
get one from the [Voxide dashboard](https://voxide.app/dashboard). `localhost`
works without any extra setup; whitelist the domain there when you deploy.

```bash
pnpm dev
```

Wake word activation needs Chrome or Edge. Everywhere else the app falls back
to click to talk, and the keyboard stays available throughout.

## Scripts

```bash
pnpm dev        # start the dev server
pnpm build      # typecheck, then production build
pnpm preview    # serve the production build
pnpm typecheck  # tsc --noEmit
pnpm lint       # oxlint
pnpm lint:fix   # oxlint --fix
pnpm fmt        # oxfmt
pnpm fmt:check  # oxfmt --check
```

`dev` and `build` first copy Blockly's sprites and sounds into
`public/blockly-media`, which is generated and not committed.

CI runs lint, format check, typecheck and build on every push and pull request.

## Layout

```
src/
  blocks/       block definitions and the toolbox
  components/   React components, including the workspace mount
  hooks/        useBlocklyWorkspace and friends
  voice/        Voxide capabilities and handlers
  locales/      en, am, om
```

## Rules we are holding to

These are in [AGENTS.md](AGENTS.md) in more detail, but the short version:

1. One operation per sentence. The child builds the program, not the agent.
2. Nothing requires a click. If an action is mouse only, it is a bug. That
   includes confirmation prompts — a dialog you have to click to dismiss is
   useless to someone who cannot click, so confirmation happens by voice.
3. Around fifteen blocks. A small set that works beats a large set that mostly
   works.
4. Every label and spoken line comes from a locale file. English, Amharic and
   Afaan Oromo from the start, not retrofitted later.

## Scope

Bloxide is aimed at children with motor impairment and clear speech.

We are not trying to serve severe dysarthria. Speech recognition accuracy drops
sharply there, and that is a problem in the acoustic models rather than
something we can fix in a browser. Saying so up front seemed more useful than
promising something we cannot deliver.

## Research

Our reading and our decisions are public.

- [Voice-Controlled Scratch for Children with (Motor) Disabilities](https://arxiv.org/abs/2603.28246),
  Goller, Fraser and Graßl, ITiCSE 2026. The paper that convinced us the gap
  was real.
- [Accessibility barriers in block based programming](https://link.springer.com/article/10.1007/s10209-026-01351-6),
  literature review, 2026.
- Our full reading list and notes:
  [ScholarXIV collection](https://www.scholarxiv.com/collections/share/20668bcf184466af0c88a55fc256ad93635c32032365a97cc437a9344c0534e7)

## About

Built for the [STARK Official Hackathon](https://hackathon.stark.et),
September 2026.
