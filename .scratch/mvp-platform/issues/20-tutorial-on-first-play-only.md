# 20: Tutorial on a game's first play only

**What to build:** A game's tutorial plays only the first time a student plays that game. After that it's never shown again (founder's call, every game). The play shell tells each game whether this is the student's first play of it, and the game skips its tutorial when it isn't. The answer comes from the play records the API already stores, so nothing new is stored and nothing lives in the browser.

**Blocked by:** 21

**Status:** ready-for-human

- [x] `GameProps` in `@repo/game-contract` gains `firstPlay: boolean`: true when the student has no earlier play of this game, in any class and at any tier
- [x] "Earlier play" means any stored play record for this student and game slug. A play counts as soon as any of its records has arrived, including one that ended `crashed`
- [x] The API answers it for the signed-in student, and the play shell gets it through a platform port (a new method, or part of an existing one), with the stand-in and the real adapter both passing a contract suite
- [x] Records can arrive late, so a play on another device may not count yet. That's accepted: at worst the tutorial plays one extra time
- [x] The shell never holds a game back waiting for the answer. If the API can't be reached, `firstPlay` is true, because showing the tutorial again is better than leaving a new student without one
- [x] `@repo/game-kit`'s fake shell lets a game's tests and tours set `firstPlay` either way
- [x] Fraction Hop uses it: the tutorial plays only when `firstPlay` is true. Update `games/fraction-hop/SPEC.md`'s Tutorial section and remove its open question about the tutorial playing every play. The spec's "and again when a block type appears that the student hasn't seen" is dropped, because the founder's rule is first play only
- [x] Tests: API integration tests (no earlier plays, an earlier play of the same game at another tier or in another class, a play of a different game, a crashed play), and a rendered-app test that a returning student's Fraction Hop starts at task 1 with no tutorial

## Comments

**Agent, 2026-10-30:** Built; over to the founder to check and commit.

- API: `GET /games/{slug}/played` → `{ played }` (`hasPlayed` in `apps/api/src/play-records.ts`): true once any of the signed-in student's records for that game is stored. It reads existing rows, so there's no migration.
- Port: `PlayRecordsPort.played(game)`, implemented by the real adapter and the stand-in. Three contract cases cover it: nothing stored, a crashed-only play, and another game's records. The stand-in now keeps which games each student has played in localStorage (`kindling.stand-in.played`), so a reload in stand-in dev knows a returning student, and the tour can set either case.
- Shell: `boot` asks while the game loads and never waits for the answer. `firstPlay` is fixed when the student taps Start, from whatever has come back by then. No answer yet, or a failure, counts as a first play. The outbox now only needs `send`.
- `GameProps.firstPlay` is in `@repo/game-contract`. `mountGame` takes `firstPlay` (true by default). Tours get `firstPlay?({ grade, first })` and `TourContext.firstPlay`. Fraction Hop's tour is new to the game at the widest size, where the tutorial is watched or skipped as before, and returning at the others, where it checks that no tutorial shows.
- Fraction Hop: a returning student opens straight onto task 1, with its goal said. SPEC.md's Tutorial section is updated, and the open question and the "new block type" rule are removed.
- Proof: 7 API integration tests (none, a partial play, crashed only, another class at another tier, another game, another student's plays, students only); 3 contract cases × 2 implementations; a stand-in reload test; 7 rendered-app tests in `App.test.tsx` (first play, played before, other game only, can't check, never answered, a returning student's Fraction Hop at task 1 with no Skip, a new student's with it); a Fraction Hop fake-shell test. Each was checked by breaking its guard. The api (270), play (346), fraction-hop (110) and game-kit (32) suites, `check-types` and Biome pass. `pnpm tour fraction-hop` is clean.
- No new voice lines.
