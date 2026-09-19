# Changelog

Progress on Bloxide, newest first. Written for anyone following the build, not
just developers — see the Changelog section of AGENTS.md.

## 2026-09-19

Voice works. The editor can be driven by speaking to it.

### Added

- **Speak to build.** Ask for a block and it appears. Ask for it to go inside
  another and it snaps in. Ask for one to go and it does, with whatever sat
  under it reconnecting. Ask to run the program, or to stop it mid-loop.
- **"That one" means something.** Attaching and deleting act on the block just
  added unless another is named, and the block the last sentence touched stays
  highlighted, so it is clear what the next one will act on.
- **Spoken words, not identifiers.** "Repeat", "loop", "print block" all reach
  the right block. Nobody should have to say `controls_repeat_ext` out loud.
- **The assistant can see the workspace.** It reads the real program before
  each sentence, so it answers from what is there rather than from what it
  thinks it did.
- **Every block wears a number.** Say "delete block two" or "put block one
  inside block three" and the right one moves, even when two blocks look alike
  and no name could tell them apart.
- **A new block comes to you.** Adding one while looking elsewhere in a long
  program used to leave the screen unchanged, which read as nothing having
  happened. The workspace now moves to show it — and stays put when the block
  was already in view.

### Why it is built this way

- **Run and Stop mean one thing.** A program started by speaking shows the same
  running state and output as one started by the button; the run does not
  belong to whichever one asked for it.
- **The assistant cannot invent blocks.** It chooses from the blocks the
  toolbox offers, and anything else is refused before it reaches the workspace.
- **Nothing is claimed that did not happen.** Every confirmation comes from
  what the editor actually did.
- **A number that can be seen is a number that can be said.** Numbers come
  from what is drawn on screen, not from an order kept separately, so the badge
  and the assistant can never point at different blocks. Numbers a misheard
  word cannot spoil are the floor this whole thing rests on.

### Next

- Changing a value by voice — "make it four times" is still out of reach.
- Saying which one by position: "the second repeat", "the last one".
- The Bloxide block set: one stage, one sprite, about fifteen blocks.

## 2026-09-18

Day one. The editor works end to end; nothing is voice-driven yet.

### Added

- **Block workspace.** Blockly on the zelos renderer — rounded, Scratch-like,
  familiar to a child who has seen Scratch — with a starter toolbox of logic,
  loops, math and text blocks. Drag, snap, edit values.
- **Run and Stop.** Run turns the blocks into a running program; Stop halts it
  partway through, even mid-loop. Whatever the program prints appears in a
  panel on the page.
- **The program survives a reload.** Blocks are saved as they change and
  restored when the page opens, so nothing is lost to a stray refresh.

### Why it is built this way

- **Run and Stop are not buttons with logic inside them.** They are functions
  the voice layer will call directly. If an action can only happen by clicking,
  a child who cannot use a mouse cannot reach it — so no action in Bloxide is
  allowed to live in a click handler.
- **Stop had to be designed for, not added.** A program that holds the browser
  hostage cannot be interrupted by any button, so every loop pauses briefly to
  let a Stop land.
- **Printing goes to the page, not a pop-up.** A browser alert has to be
  dismissed by clicking, which puts the child right back where they started.

### Next

- The voice layer: speaking a block into existence.
- The Bloxide block set: one stage, one sprite, about fifteen blocks.
