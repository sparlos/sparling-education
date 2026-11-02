# 01: Lab prototype and founder verdict

**What to build:** a rough, throwaway notebook in the prototype lab, so the founder can decide whether the real one goes ahead. It has two screens: the notebook over Cargo Line, and a rough Fraction Hop screen with its controls along the bottom, to test shrinking the notebook out of the way. Keep it to the lab's standard of rough: no tests, no strings table, no game contract.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] The founder can open both screens from the lab
- [x] The notebook slides out from the left over about two-thirds of the game, with pale squares of about 40 px, no scrolling or snapping, and one dark pen colour, and it shows a small picture of the task
- [x] It shrinks to a card about the size of a large playing card, showing only the writing, zoomed to fill it, and the card can be dragged anywhere on the screen but not off it
- [x] Ink holds at least 30 fps while drawing at 4× CPU throttling, measured in headless Chrome and the number reported to the founder
- [x] The founder has tried writing 50 000 − 1 250 with a finger, and judged the square size, how much a page holds, shrinking, reading the card and dragging it clear of the controls
- [ ] The founder's verdict is recorded under `## Comments` here, and anything it changes is updated in the spec
- [ ] If the verdict is no, the remaining notebook tickets are marked `wontfix`

## Comments

### 2026-11-01: built, waiting for the founder's verdict

Built as two lab prototypes, `notebook-cargo-line` and `notebook-fraction-hop`, on a shared `notebook-kit.tsx`. Cargo Line's first task is always 50 000 − 1 250. `lab/cargo-line` gained optional `notebook` and `firstJob` props.

**Ink speed:** 60 fps at 4× CPU throttling on both screens (frame time p95 16.8 ms, worst 16.8 ms), against the 30 fps target. Measured in headless Chrome over 12 s of touch drawing at about 56 pointer moves a second, 12 strokes per run. Limits: this is the sandbox's CPU, not a Chromebook; a short busy loop slowed by about 3× under the 4× setting; and the frame count shows the page keeps up, not how long ink takes to appear under a finger. The founder's finger test is the real check on lag.

**Checked in headless Chrome:** the sheet covers 850 of 1278 px (the game area right of the button), with 21 × 12 squares at 40 px on a 1366 × 650 screen. The card can't be dragged off any edge. Go closes the sheet and leaves the card. Writing stays until the next task, which empties the page and the card.

**Choices the spec left open, for the founder to judge:**

- The card is landscape (266 × 190), because the page and a written sum are both wider than tall.
- A grow button sits in its own column on the card, so it never covers writing.
- The sheet has 32, 40 and 48 px square buttons for the test. They're lab-only and don't carry into the real notebook.
- There's a Clear button so the test can be retried, but no eraser or Undo. Those are ticket 03.

### 2026-11-01: founder's verdict

Yes to everything tried so far: "writing is ok, square size can be 40, shrink is good, drag of shrink is good." The defaults stand, so the lab's square-size buttons are gone.

New idea from the founder: drag the values in the task picture onto the page, so there's less to write out, as a generic piece that can hold whatever the game sends (numbers, images, arrays later). Added to both prototypes and to the spec, marked as being tried.

Choices made for it, for the founder to judge:

- Tapping a piece shows a ✕ rather than deleting straight away. A stroke starting on a piece is ink, so a digit can be crossed out when regrouping, and a stray tap shouldn't lose the piece.
- Pieces snap to the squares, one square per character for numbers, so columns line up. Ink still doesn't snap.

Still to do: see the next comment.

### 2026-11-01: founder's changes after trying it

- Kids won't love drawing on a Chromebook, so students mostly tap: a square, then a key. The highlighted square doesn't move on its own. The pen stays beside the keys.
- The notebook now covers the whole screen, and the game can't be played while it's open. Shrinking to the card is how a student reads their working beside the game.

Both are in the prototype and the spec. Numbers dragged in now land as ordinary typed squares, so they can be crossed out; other pieces stay whole.

Still to do: the founder tries this on a Chromebook. Then the verdict boxes here, and rewriting tickets 02–04 for keys, a full-screen notebook and pieces, plus new tickets as needed.

### 2026-11-01: regrouping changed

The founder found separate Cross out and Small keys too clumsy for borrowing across 50 000 (17 taps). Replaced with typing over a digit, which crosses it out and writes the new one small above it (9 taps). The whole sum drops from 27 taps to 19. The founder is trying it.

### 2026-11-01: Borrow key added

Typing out each borrowing step was still awkward (15 taps for 50 000 − 1 250, going one step at a time). Added a Borrow key, "for now" in the founder's words (6 taps). The founder also noted that addition has to work differently from subtraction. The spec records this as not yet designed, and it needs settling before ticket 1 closes or tickets 02–04 are rewritten.
