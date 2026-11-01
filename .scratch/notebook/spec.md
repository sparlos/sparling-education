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
- **Pen first.** The first version has a pen (finger or stylus), an eraser and a clear-the-page button. Clear works with one tap and no "Are you sure?", then turns into Undo until the student writes again. Base-ten blocks and the number line are a later decision of their own: they're much more to build and teach, and they could do a game's job for the student.
- **Squared paper.** One page per task of pale squares, about 40 px (sized from a finger-writing test in the lab), with no scrolling and no snapping, and one dark pen colour. The squares help line up columns.
- **It shows the problem.** The student never switches back and forth between the game and the notebook. The game hands the shell a small picture of the current task, drawn by the game itself (for Cargo Line, a mini strip of the route's signs), so it works for Grades 1–3 without reading.

### On the screen

- **Opens beside the game.** A button in the shell's left-hand column slides it out from the left, over about two-thirds of the game. The rest of the game stays usable, so a student can read their working while they answer. The game closes it when the action starts (Go in Cargo Line). The working stays until the next task. A full-screen notebook was rejected: a student would have to remember a six-digit answer on the way back to the game, and a copying slip would look like a maths mistake to the teacher.
- **It shrinks.** A student can shrink the notebook to a small card and drag it around the screen, so they can reach any game's controls and still see what they wrote.
  - The card is about the size of a large playing card. It shows only their writing, zoomed to fill it, without the squares or the task picture, since the game is visible by then. A stray mark far from the sum makes the sum smaller until it's erased; that's accepted.
  - It's dragged from anywhere on it, can't leave the screen, and stays where it's put for the rest of the play.
  - Writing needs the full notebook, which the card's grow button brings back.
  - When the action starts, the game closes the full-size notebook only. The card stays, and empties with the page when a new task arrives.
- **Answering on the right is a preference, not a rule.** New games try to keep their answer controls in the right-hand third, clear of the notebook, but a game's layout comes first. Fraction Hop keeps its controls along the bottom, because the course would be too cramped otherwise (founder's call). Shrinking covers those games.

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

- More tools, if real use asks for them: base-ten blocks you can break and group, an open number line, fraction strips, counters, arrays.
