# 07: Fraction Hop gets the notebook

**What to build:** a student playing Fraction Hop can open the notebook, see the distance to reach in a small picture the game draws, and work it out there. The game keeps its controls along the bottom (founder's call), so a student reaches them by shrinking the notebook to a card and dragging it clear. The notebook closes when the hops start.

**Blocked by:** 02: Notebook over Cargo Line, with a pen; 04: Shrink to a draggable card

**Status:** ready-for-agent

- [ ] The game hands over no task during its tutorial, so there's no button then
- [ ] Each new task hands over its picture, with the same task ID that task's attempts use
- [ ] The picture can be understood without reading, at every tier
- [ ] A retry of the same task keeps the working
- [ ] The full-size notebook closes when the action starts, and the card stays
- [ ] With the notebook open, a student can shrink it, drag the card clear and use every bottom control while still seeing their writing, checked in headless Chrome at 1366 × 768 and 1280 × 650
- [ ] The game stays playable without ever opening the notebook
- [ ] Fake-shell tests cover the task and close calls, and `pnpm tour fraction-hop` passes
- [ ] The game's spec notes the notebook, and its version doesn't change
