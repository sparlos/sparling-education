# Notebook: a scratch-work drawer in the play shell

Status: ready-for-agent

Raised 2026-11-01 while designing the addition and subtraction game (Cargo Line), and designed with the founder the same day.

## The problem

Some tasks need working out. Grade 5 sums run to 100 000 and decimals to hundredths, and hard regrouping trips up even adults without pen and paper. The curriculum asks students to solve with "appropriate tools, strategies, and algorithms", but no game gives them anywhere to work. A student should never *have* to reach for paper. Paper stays fine for those who want it.

## The idea

A drawer that slides out over a game, owned by the play shell (like voice), so games get it for free. It's like Prodigy's slide-out manipulatives beside a question.

## Decisions

### What it is

- **Shell-owned.** It's an overlay, not part of any one game.
- **Optional.** No game may depend on it to be playable. Cargo Line works without it.
- **Keys first, with a pen beside them** (the founder's call, 2026-11-01; being tried in the lab). Drawing is awkward on a Chromebook, and very hard on one without a touchscreen, so students mostly tap. The first version has keys, a pen (finger or stylus), an eraser and a clear-the-page button. Clear works with one tap and no "Are you sure?", then turns into Undo until the student writes again. Base-ten blocks and the number line are a later decision of their own: they're much more to build and teach, and they could do a game's job for the student.
- **Squared paper.** One page per task of pale 40 px squares (the founder's call after a finger-writing test in the lab), with no scrolling and no snapping of ink, and one dark pen colour. The squares help line up columns.
- **Typing in squares.** The student taps a square, then taps a key, and the character fills that square.
  - The highlighted square doesn't move on its own, because working runs right to left in a column sum and left to right elsewhere. The student taps the next square. Typing again straight away replaces a digit just typed.
  - **Regrouping works like paper.** Typing on a digit that was already in the square crosses it out and writes the new digit small above it. A second digit straight away joins it, for 10. Delete undoes this and brings the old digit back. There are no cross-out or small keys: separate keys took 17 taps to borrow across 50 000, and this takes 9.
  - **Borrow key** (being tried in the lab). Tap the digit that needs more, then Borrow: it gains ten and the digit on its left loses one, each crossed out with the new value small above. A 0 on the left has nothing to give, so nothing happens until that 0 has borrowed. 50 000 − 1 250 takes 6 taps this way, one borrow at a time, as a student would think it through. The student still decides when and where to borrow; the notebook only does the rewriting.
  - **Addition works differently, and isn't designed yet.** Carrying writes a digit above the next column without changing or crossing out the digit there, so typing over a digit is wrong for it, and Borrow doesn't apply. For now a carried digit goes full size in the empty square above the column. Which of these keys a game gets may depend on whether its task adds or subtracts.
  - The keys are 0–9, a decimal point, + and −, a line, Borrow and delete, in the same layout as a game's number pad. The line runs under the whole sum.
  - A real keyboard works too: its keys type, and the arrows move the highlighted square.
  - Only arithmetic for now, so there's no category menu. When a second set of keys exists, the game will choose which one it gets. A picker comes only if one game needs two.
- **It shows the problem.** The student never switches back and forth between the game and the notebook. The game hands the shell a small picture of the current task, drawn by the game itself (for Cargo Line, a mini strip of the route's signs), so it works for Grades 1–3 without reading.
- **Pieces: what's already known can be dragged onto the page** (the founder's idea, 2026-11-01; being tried in the lab). A student shouldn't have to copy out numbers the game already shows.
  - A game marks parts of its picture as draggable, and each hands over anything it can draw: a number, a fraction, an image, later an array. The notebook only places them and moves them around, so it needs no change for a new kind of piece. A game offers only what wouldn't do its job for the student.
  - A number lands as ordinary typed squares, one per character, so columns line up and its digits can be crossed out or fixed like any others.
  - Anything else snaps to the squares and stays whole. Tapping it selects it: it can then be dragged, or removed with its ✕. Rubbing the eraser over it removes all of it. Ink goes over it, and a stroke that starts on it is ink.
  - Pieces shrink onto the card with the writing, and empty with the page.

### On the screen

- **Opens over the whole screen** (the founder's call, 2026-11-01, replacing an earlier design that left a third of the game usable). The game can't be played while it's open. A button in the shell's left-hand column slides it out from the left. The game closes it when the action starts. The working stays until the next task. The earlier worry about a full-screen notebook, a student having to remember a six-digit answer on the way back to the game, is answered by shrinking: the card shows the working beside the game.
- **It shrinks.** A student can shrink the notebook to a small card and drag it around the screen, so they can answer in the game and still see what they wrote.
  - The card is about the size of a large playing card. It shows only their writing, zoomed to fill it, without the squares or the task picture, since the game is visible by then. A stray mark far from the sum makes the sum smaller until it's erased; that's accepted.
  - It's dragged from anywhere on it, can't leave the screen, and stays where it's put for the rest of the play.
  - Writing needs the full notebook, which the card's grow button brings back.
  - When the action starts, the game closes the full-size notebook only. The card stays, and empties with the page when a new task arrives.

### What a game does

- **Games tell it two things.** "Here's a new task", with the small picture and the same task ID the game's attempts use, and "the action is starting". The same ID again updates the picture without clearing, so retries keep the working. In code: a `notebook` prop on `GameProps`, with `notebook.task(id, picture)` and `notebook.close()`. `onProgress` can't do this: only some games use it, and it carries no picture.
- **The button appears with the first task.** A game hands over no task during its tutorial, so there's no notebook then. A game where even a pen would do its job never hands one over, so it has none; no setting is needed. `build-game` and `review-game` ask for it, and for the reason if a game leaves it out.

### What it records

- **It works like paper on the desk.** Using it is never help: it never sets `assisted`, and never affects understanding or effort.
- **Nothing is kept or sent.** Drawings disappear when the task changes or the student leaves the game. Students could draw something inappropriate, as they could on paper, but it never leaves their screen and never persists (principle 7). Whether a student used it isn't sent either, and teachers never see it. We learn how much it's used by watching the pilot and asking teachers.

### How students find it

- **The button glows, silently,** until the student has opened it once. That's remembered on the device only.
- **The first opening plays one spoken welcome,** with a caption: "Here's your notebook. Work things out here, like on paper. It's just for you, and it empties when you move on." Speaking only on a tap means it never cuts off a game's voice by surprise, and Hear Again brings back a line it did cut off. The line needs `pnpm voice` once it's built.
- **Games never suggest it.** Help is the help ladder's job.

## How it gets built

1. **A throwaway lab prototype first, and the founder's verdict decides whether the real one goes ahead.** A rough notebook over Cargo Line, plus a rough Fraction Hop screen with its controls along the bottom. The founder tries writing 50 000 − 1 250 with a finger, the square size, how much a page holds, shrinking, reading the card and dragging it clear of the controls. Check how quickly ink follows the pen with 4× CPU throttling (at least 30 fps while drawing).
2. **Then the real one, in all three games at once:** the shell's notebook and the contract change, then a task picture for each game (Cargo Line's strip of signs, Crystal Machine's number to build, Fraction Hop's distance to reach). A notebook in only one game would make students wonder where it went in the others.

It doesn't change what any tier evidences, so no game's version changes.

## Later

- More tools, if real use asks for them: base-ten blocks you can break and group, an open number line, fraction strips, counters, arrays. Still pictures of these, such as an array, can arrive as pieces without a new tool.
