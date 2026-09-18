# Changelog

Progress on Bloxide, newest first. Written for anyone following the build, not
just developers — see the Changelog section of AGENTS.md.

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
- **Tests and CI.** 29 tests covering the editor, the runner and saving. Every
  pull request is checked automatically before it can merge.

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
- Locale files — English, Amharic and Afaan Oromo — for every label and spoken
  confirmation.
- The Bloxide block set: one stage, one sprite, about fifteen blocks.
