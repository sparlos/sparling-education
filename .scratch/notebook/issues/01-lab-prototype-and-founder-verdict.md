# 01: Lab prototype and founder verdict

**What to build:** a rough, throwaway notebook in the prototype lab, so the founder can decide whether the real one goes ahead. It has two screens: the notebook over Cargo Line, and a rough Fraction Hop screen with its controls along the bottom, to test shrinking the notebook out of the way. Keep it to the lab's standard of rough: no tests, no strings table, no game contract.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The founder can open both screens from the lab
- [ ] The notebook slides out from the left over about two-thirds of the game, with pale squares of about 40 px, no scrolling or snapping, and one dark pen colour, and it shows a small picture of the task
- [ ] It shrinks to a card about the size of a large playing card, showing only the writing, zoomed to fill it, and the card can be dragged anywhere on the screen but not off it
- [ ] Ink holds at least 30 fps while drawing at 4× CPU throttling, measured in headless Chrome and the number reported to the founder
- [ ] The founder has tried writing 50 000 − 1 250 with a finger, and judged the square size, how much a page holds, shrinking, reading the card and dragging it clear of the controls
- [ ] The founder's verdict is recorded under `## Comments` here, and anything it changes is updated in the spec
- [ ] If the verdict is no, the remaining notebook tickets are marked `wontfix`
