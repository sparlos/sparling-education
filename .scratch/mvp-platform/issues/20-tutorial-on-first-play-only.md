# 20: Tutorial on a game's first play only

**What to build:** A game's tutorial plays only the first time a student plays that game. After that it's never shown again (founder's call, every game). The play shell tells each game whether this is the student's first play of it, and the game skips its tutorial when it isn't. The answer comes from the play records the API already stores, so nothing new is stored and nothing lives in the browser.

**Blocked by:** 21

**Status:** ready-for-agent

- [ ] `GameProps` in `@repo/game-contract` gains `firstPlay: boolean`: true when the student has no earlier play of this game, in any class and at any tier
- [ ] "Earlier play" means any stored play record for this student and game slug. A play counts as soon as any of its records has arrived, including one that ended `crashed`
- [ ] The API answers it for the signed-in student, and the play shell gets it through a platform port (a new method, or part of an existing one), with the stand-in and the real adapter both passing a contract suite
- [ ] Records can arrive late, so a play on another device may not count yet. That's accepted: at worst the tutorial plays one extra time
- [ ] The shell never holds a game back waiting for the answer. If the API can't be reached, `firstPlay` is true, because showing the tutorial again is better than leaving a new student without one
- [ ] `@repo/game-kit`'s fake shell lets a game's tests and tours set `firstPlay` either way
- [ ] Fraction Hop uses it: the tutorial plays only when `firstPlay` is true. Update `games/fraction-hop/SPEC.md`'s Tutorial section and remove its open question about the tutorial playing every play. The spec's "and again when a block type appears that the student hasn't seen" is dropped, because the founder's rule is first play only
- [ ] Tests: API integration tests (no earlier plays, an earlier play of the same game at another tier or in another class, a play of a different game, a crashed play), and a rendered-app test that a returning student's Fraction Hop starts at task 1 with no tutorial
