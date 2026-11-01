# 06: Crystal Machine gets the notebook

**What to build:** a student playing Crystal Machine can open the notebook, see the number they're building in a small picture the game draws, and work it out there. The notebook closes when the machine's action starts.

**Blocked by:** 02: Notebook over Cargo Line, with a pen

**Status:** ready-for-agent

- [ ] The game hands over no task during its tutorial, so there's no button then
- [ ] Each new task hands over its picture, with the same task ID that task's attempts use
- [ ] The picture can be understood without reading, at every tier
- [ ] A retry of the same task keeps the working
- [ ] The full-size notebook closes when the action starts
- [ ] The game stays playable without ever opening the notebook
- [ ] Fake-shell tests cover the task and close calls, and `pnpm tour crystal-machine` passes
- [ ] The open notebook is checked in headless Chrome at 1366 × 768, and shrinking is the way to reach any controls it covers
- [ ] The game's spec notes the notebook, and its version doesn't change
