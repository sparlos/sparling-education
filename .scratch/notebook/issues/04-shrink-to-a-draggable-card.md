# 04: Shrink to a draggable card

**What to build:** a student can shrink the notebook to a small card and drag it around the screen, so they can reach any game's controls and still see what they wrote. See the spec's "It shrinks" section.

**Blocked by:** 02: Notebook over Cargo Line, with a pen

**Status:** ready-for-agent

- [ ] The notebook shrinks to a card about the size of a large playing card
- [ ] The card shows only the student's writing, zoomed to fill it, without the squares or the task picture
- [ ] A mark far from the rest makes the writing smaller until it's erased, as the spec accepts
- [ ] The card can be dragged from anywhere on it, and can't leave the screen
- [ ] The card stays where it's put for the rest of the play, including when the student grows and shrinks it again
- [ ] The student can't write on the card, and its grow button brings back the full notebook with the working intact
- [ ] When the action starts, the game's close call closes the full-size notebook only, and the card stays
- [ ] A new task empties the card along with the page, and the card stays where it was put
- [ ] Controls under the card can be reached by dragging it away, checked in headless Chrome at 1366 × 768 and 1280 × 650
- [ ] Dragging the card doesn't also act on the game beneath it
