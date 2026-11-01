# 02: Notebook over Cargo Line, with a pen

**What to build:** the first complete path through the system. A student playing Cargo Line taps a button in the shell's left-hand column, and a notebook slides out over about two-thirds of the game. It shows the route's signs as a mini strip, and they can write on squared paper with a finger or stylus while the rest of the game stays usable. The game tells the shell about each new task and when the action starts, through a new `notebook` prop on `GameProps` with `notebook.task(id, picture)` and `notebook.close()`.

An approved contract change goes in the contract, the shell, the fake shell and the contract's type test together. See the spec's "What a game does" section.

**Blocked by:** 01: Lab prototype and founder verdict (needs a yes)

**Status:** ready-for-agent

- [ ] The button is absent during Cargo Line's tutorial and appears with the first task
- [ ] A game that never hands over a task has no button, with no setting needed
- [ ] The notebook opens beside the game, shows the game's picture of the current task, and has pale squares of the size the prototype settled on, with no scrolling, no snapping and one dark pen colour
- [ ] The part of the game the notebook doesn't cover stays usable while it's open
- [ ] Go closes the notebook, and reopening it before the next task shows the working still there
- [ ] A new task ID empties the page and shows the new picture
- [ ] The same task ID updates the picture without clearing, so a retry keeps the working
- [ ] Leaving the game discards the drawing, and the notebook is unavailable while the leave question is showing
- [ ] Tests show that using the notebook sends nothing, keeps nothing, and never sets `assisted`
- [ ] The fake shell records notebook calls and reports misuse, and Cargo Line's fake-shell tests cover them
- [ ] A task's ID matches the one on that task's attempts in Cargo Line
- [ ] `pnpm tour cargo-line` passes, and the open notebook is checked in headless Chrome at 1366 × 768, including its target sizes
- [ ] Ink still holds at least 30 fps at 4× CPU throttling
