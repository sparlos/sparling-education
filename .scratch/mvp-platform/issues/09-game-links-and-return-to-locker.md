# 09: Game links, and returning to the locker

**What to build:** A game link from a teacher signs the student in if needed, joins them to its class if they aren't in it, and opens the game. When any game ends, the student is back in their locker.

**Blocked by:** 07

**Status:** done

- [x] A game link carries its class. Opening it signed out goes to sign-in and then straight back to it
- [x] A student not in the class is joined to it first, including the split-grade pick, and the play records that class
- [x] The game link no longer has a portal parameter, and `LinksPort.hub` is replaced by a link to the locker that names the play (ready for ticket 14's reveal)
- [x] A game link for a game that's turned off, or a bad join code, shows a plain spoken message and a way to the locker
- [x] The play shell's route tests and end-to-end test are updated, and the integration tests cover joining through a game link

## Comments

**2026-10-29, agent:** Done (committed as `9861428`).

- **Game links:** `GameLink.portal` is gone, and `joinCode` (from `?join=`) took its place. In `boot`, a game link with a join code signs the student in if needed (sign-in already carried the whole link through as `next`), then has them design their avatar if they have none. Then it joins its class through `MembershipsPort.join`, which also finds a student who's already in the class. A split class asks for the grade first, using the locker's `GradePick`, and then the link reopens. The play is for that class and never falls back to another. A join code no class has (`no-such-class`) and a class with the game off (new line `game-off`, "That game is turned off for your class.") each get a spoken message and a "Go to your locker" button. The student stays in a class whose game is off, for its other games. A teacher opening any game link now gets the spoken "This is for students" screen, not "try again".
- **Back to the locker:** `LinksPort.hub({ portal, play })` is now `LinksPort.locker(play)`, which gives `/play/?play=<play>` on both platforms (`lockerPath` in `routes.ts`). `Play.end` resolves to that link, and every ending (finished, left, crashed) goes there. The end screen ("Well done!", "See you next time!", "Play again") is removed, and so are the stand-in hub screen and its path. A crashed game's error message now has a "Go to your locker" button. The locker doesn't read `?play` yet; ticket 14 adds the reveal.
- **Tour:** `pnpm tour` now passes when the play ends at the locker URL with `?play`. It no longer looks for the end screen's text.
- **Tests:** route tests cover `?join` and `lockerPath`. `App.test.tsx` covers the game link signed out, sign-in coming back to it, joining a new class, a class the student is already in, a split-class grade pick, a bad code, a game that's off, a teacher, and returning to the locker. `api/api.test.ts` boots game links over the real API: joining and recording that class, the split-class grade pick, a game turned off (set through `gamesOff` in the database, until ticket 12 adds a route), and an unknown code. Play 262 tests, type checks, Biome and `pnpm tour fraction-hop` are clean. I didn't take headless-Chrome screenshots, because the new screens reuse the join page's message-and-button layout.
- **The founder needs to:** run `pnpm voice` and commit, since `check-voice` fails until then: `game-off` is a new line, and `complete`, `left` and `play-again` are orphans now.
