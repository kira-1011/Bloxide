# Changelog

Progress on Bloxide, newest first. Written for anyone following the build, not
just developers — see the Changelog section of AGENTS.md.

## 2026-09-23

The editor looks like the design, and every part of it can be reached without
a mouse.

### Added

- **Press a block to place it.** The block list on the left is now the real
  blocks, and pressing one puts it on the workspace, numbered and highlighted,
  exactly as asking for it does. Blockly's own drawer of blocks is gone, so
  there is one list rather than two showing the same thing.
- **Blocks that show what holds what.** Repeat and forever are drawn with a
  wide open mouth, and the blocks inside sit visibly within it, spaced apart,
  instead of reading as one long stack. An empty repeat still shows its mouth,
  so a child can see where blocks go. Every block keeps the puzzle-piece notch
  a child who has used Scratch will recognise.
- **You can see whether you are being heard.** A large microphone sits in the
  same place at the bottom of the screen and changes colour: grey while
  asleep, blue while listening, with the words it heard written beside it, and
  purple while answering, with the reply. It no longer floats in a corner,
  because a control that moves cannot be aimed at.
- **More room when you want it.** "Hide the blocks" folds the block list down
  to its four colours; "show the blocks" or pressing a colour opens it again.
  Any block can still be asked for by name while it is folded, and the reply
  says so. "Make the stage bigger" and "zoom in" work the same way, and so
  does dragging the stage's edge or pressing the arrow keys on it.
- **Zoom and delete as big buttons.** The small grey zoom icons and the bin
  are replaced by large buttons in the corner of the workspace. The bin only
  ever worked for someone who could drag a block into it; the new delete
  button removes the block that is highlighted.

### Fixed

- **"Voice is used up" says so.** When the voice service runs out of time, the
  microphone used to say "I could not hear you", which sounds like the child
  did something wrong. It now says "Voice is used up for now. Ask a grown-up."
- **Nothing jumps for a child who asked for stillness.** Choosing a colour in
  the block list scrolls without animation when the computer is set to reduce
  motion.
- **The workspace stays usable on a small screen.** On a narrow laptop the
  block list and stage left almost no room to build. The workspace now keeps a
  usable width, and the row scrolls sideways past that.

### Next

- The new spoken commands for hiding blocks, resizing the stage and zooming
  reach the assistant only once the site is redeployed.
- The listening and answering colours have been tested but not yet seen in a
  live call: the voice service had run out of time.
- Nobody under twelve has tried any of this yet.

## 2026-09-22

### Added

- **Starting over is something you can say.** "Clear everything and start
  again" empties the workspace, and blocks can go several at a time — "delete
  blocks one and three". Emptying it by hand meant dragging each block to the
  bin one at a time, which is the one thing our children cannot do, so until
  now the only way out of a tangled program was a mouse.

### Fixed

- **Asking for a block works.** The assistant had stopped adding blocks
  altogether while still answering "I've added a move block" — the list it
  chose from was written in names nobody says out loud. It now picks from the
  words a child uses, and says them back: "add a loop", "make him disappear"
  and "add something that makes it pause" all land on the right block.
- **You can watch the sprite go.** A four-times loop used to finish faster than
  a single frame, so the sprite did not travel — it was simply somewhere else
  when the program ended. Loops now run at Scratch's speed, a step every
  thirtieth of a second, and a child can see the repeat happening. Stop still
  halts it at once.
- **A value lands on the block you meant.** Saying "walk a hundred steps" and
  then "turn ninety degrees" could put the ninety on the walking block: adding
  a block renumbers the others, and the assistant was told the numbering as it
  had been a moment before. Every answer now carries the number with it —
  "Added a move block. It is block 3."

### Changed

- **One place to look when a run goes wrong.** The output panel under the
  editor is gone — the sprite has spoken in a bubble since the block set
  changed, so the panel only ever sat there empty. If a program does fail, it
  now says so beside Run and Stop, where the child was already looking to start
  it.

### Next

- Numbers still shift when a block is added, so a badge means "second from the
  top" rather than "this block". Naming a block and having the name stick is
  the next thing the reference system needs.
- Nobody under twelve has tried any of this yet.

## 2026-09-20

### Added

- **Blocks that do something.** The palette is now Bloxide's own twelve —
  move, turn right, turn left, go to x y, say, say for secs, change size by,
  hide, show, wait, repeat and forever — in the four colours of the design:
  movement, say, look, control. Say "add a move block", "make it fifty steps",
  "run it", and the sprite moves. Blockly's starter Logic, Math and Text
  blocks are gone; they were scaffolding.
- **The sprite speaks instead of a print panel.** A say block puts words in a
  bubble on the stage, where the child is already looking, rather than in a
  list of output underneath.
- **No hat block.** A program runs top to bottom when the child says "run it".
  Every block that starts a program in Scratch is named after a mouse click.

- **No more holes to fill.** A block asked for by voice now arrives with its
  values already in it — a print block used to appear with an empty socket, and
  the only way to fill a socket is to drag a block into it. Saying a new value
  over the one that is there works instead.
- **Every word means one block.** "Turn right" and "turn left" are separate
  things to say, because a bare "turn" would have been answered with whichever
  block came first — confidently, and half the time wrongly.
- **Blocks that hold two values.** Where a block has more than one value the
  assistant asks which — "say which one: x or y" — rather than guessing and
  changing the wrong one. A block with a single value is unchanged: no naming
  needed.

## 2026-09-19

Voice works. The editor can be driven by speaking to it.

### Added

- **Speak to build.** Ask for a block and it appears. Ask for it to go inside
  another and it snaps in — including one repeat inside another, where no name
  could tell the two apart. Ask for a block to go and it does, with whatever
  sat under it reconnecting. Ask to run the program, or to stop it mid-loop.
- **"That one" means something.** Attaching and deleting act on the block just
  added unless another is named, and the block the last sentence touched stays
  highlighted, so it is clear what the next one will act on.
- **Spoken words, not identifiers.** "Repeat", "loop", "print block" all reach
  the right block. Nobody should have to say `controls_repeat_ext` out loud.
- **The assistant can see the workspace.** It reads the real program before
  each sentence, so it answers from what is there rather than from what it
  thinks it did.
- **Say which one by number.** Say "delete block two" or "put block one
  inside block three" and the right one moves, even when two blocks look alike.
  A bare number or piece of text is named by what it is rather than by a badge,
  so nothing sits on top of the value you are typing.
- **A new block comes to you.** Adding one while looking elsewhere in a long
  program used to leave the screen unchanged, which read as nothing having
  happened. The workspace now moves to show it — and stays put when the block
  was already in view.
- **Change a value, not just place a block.** "Set the repeat block to four
  times" changes how many times a loop runs; "change it to not equals" picks a
  different comparison; a text block takes whatever is said. The block being
  changed is highlighted and brought into view, so the change is seen as well
  as heard.

### Why it is built this way

- **Run and Stop mean one thing.** A program started by speaking shows the same
  running state and output as one started by the button; the run does not
  belong to whichever one asked for it.
- **The assistant cannot invent blocks.** It chooses from the blocks the
  toolbox offers, and anything else is refused before it reaches the workspace.
- **Nothing is claimed that did not happen.** Every confirmation comes from
  what the editor actually did — a value is read back out of the block after it
  is set, so a number the block quietly adjusted is spoken as the block holds
  it, not as it was asked for.
- **A number that can be seen is a number that can be said.** Numbers come
  from what is drawn on screen, not from an order kept separately, so the badge
  and the assistant can never point at different blocks. Numbers a misheard
  word cannot spoil are the floor this whole thing rests on.

### Next

- Saying which one by position: "the second repeat", "the last one".
- Phrasing that leans on the block already being the subject — "make it four
  times" is understood as a value change only when the block is named.
- The Bloxide block set: one stage, one sprite, a small set of blocks.

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
- The Bloxide block set: one stage, one sprite, a small set of blocks.
