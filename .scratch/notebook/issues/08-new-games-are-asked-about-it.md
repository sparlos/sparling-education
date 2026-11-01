# 08: New games are asked about it

**What to build:** every new game gets the notebook unless there's a stated reason not to. The starter kit's template game hands over a task, and the skills that build and review games ask about it. A game can leave it out only when even a pen would do its job.

**Blocked by:** 02: Notebook over Cargo Line, with a pen

**Status:** ready-for-agent

- [ ] The template game hands over a task with a small picture and closes the notebook when its action starts, and a game made from the template passes its tests
- [ ] `build-game` asks for the notebook's task picture and close call, or for the reason a game leaves it out
- [ ] `review-game` checks the same, plus that the game plays without the notebook, never suggests it, and hands over no task during its tutorial
- [ ] The design guidance says answer controls in the right-hand third are a preference, and that a game's layout comes first
- [ ] The game-kit docs explain how a game uses the notebook
- [ ] `design-game` asks whether a pen would do the game's job, so the question comes up before building
