# 32: Stickers and keepsakes, from scratch

**What to build:** The data and API behind the new locker: sticker placements on two surfaces with a tilt, keepsakes, and what makes the small locker glow. Treat ticket 15's placements as if they never existed (ticket 26, decision 11). Wipe all demo and test data, and redesign the schema freely.

**Type:** task

**Blocked by:** 31

**Status:** ready-for-human

- [x] A placement records the sticker, its **surface** (the front or the inside of the door), its centre as fractions of that surface, its stacking order, and its **tilt** (a small angle chosen when it's placed, e.g. within ±8°). Each owned sticker has at most one placement. Moving it keeps its tilt, and taking it off and placing it again picks a new one
- [x] Keepsakes: a student has one for each game they've played. Decide whether to compute them from play records (a game with any play record by the student) or store them when a play ends; computing them is simpler if it's cheap. They never depend on effort or understanding, and don't count toward the weekly cap
- [x] "New" for keepsakes: a keepsake is new until the student opens the locker's door after getting it. An API call marks keepsakes as seen
- [x] The locker's contents (from the port) include placements, keepsakes and which keepsakes are new, so home can show the glow: there's a new keepsake *or* an owned sticker with no placement
- [x] Only the student changes their placements. Placing a sticker the student doesn't own, or one outside the surface, is refused
- [x] One migration drops or recreates the old placement data. Demo class generation makes keepsakes and placements fit the new shape. Existing demo and test data is wiped, not migrated
- [x] API tests run against the test Postgres (`docs/agents/testing.md`). Contract suite cases for the port run against both the stand-in and the real adapter
- [ ] The founder is told to apply the migration (`pnpm dev`) and run `pnpm generate`

## Notes

- Today: `StickerPlacement` in `packages/db/prisma/schema.prisma`, `PUT /locker/stickers` in `apps/api/src/locker.ts`, and the locker port in `apps/play/src/platform/ports.ts`. Use whatever names ticket 31 settled on.

## Comments

**Agent, 2026-10-31:** Built. What ticket 33 builds on:

- **Schema** (migration `20261104120000_locker_surfaces_and_keepsakes`): `StickerPlacement` is dropped and made again with `surface` (`front` | `inside`), `x`, `y`, `tilt` (degrees) and `placedAt`, which is the stacking order (the latest on top). A new `Keepsake` table has one row per student and game, with `firstPlayedAt` and `seenAt`. Old placements are dropped. Existing play records get a keepsake each, new.
- **Keepsakes are stored, not computed.** "New" needs a stored seen-time either way, and storing them means home doesn't scan every play record. A keepsake is made in the same transaction that stores a game's first record, however the play goes. It doesn't depend on effort, a play ending, or the cap. They're listed in the order first played (by arrival), so each one keeps its place in the locker.
- **The API picks the tilt** (`randomStickerTilt`, within ±`maxStickerTilt` = 8°, both in `@repo/rewards`), so the student never controls it.
- **Per-sticker endpoints** replace `PUT /locker/stickers`. `PUT /locker/stickers/{sticker}` with `{ surface, x, y }` returns the `Placement`. It puts the sticker on top, and a move keeps its tilt, including a move to the other surface. `DELETE /locker/stickers/{sticker}` takes it off, so placing it again gives it a new tilt. `POST /locker/keepsakes/seen` takes `{ games }`. It's a 400 for a sticker the student doesn't own or a spot off the surface.
- **`GET /home`** now has `placements` (with surface and tilt), `keepsakes` and `newKeepsakes`. On the port, `lockerGlows(home)` in `ports.ts` is the glow rule. `HomePort` has `place(sticker, spot)`, `takeOff(sticker)` and `markKeepsakesSeen(games)`. The stand-in keeps all of it in storage and has `standInGiveKeepsakes` for tests.
- **Demo class:** each demo student has a keepsake for each game. All are seen except Amara's newest, so "View as a student" shows the keepsake moment. The stickers each student has seen are placed on both surfaces, with seeded positions and tilts, and new ones stay in the tray.
- **Ticket 15's panel still works.** It places on the front only, through the new port calls, until ticket 33 replaces it.
- **For ticket 33:** a keepsake is just a game slug. The placeholder's class colour has to come from the student's memberships, which a game they played in a class they've since left won't be in.
- Checks, in a scratch copy: API tests 288/288, play 365/365, teach 205/205, types and Biome clean. The migration applied to a fresh Postgres matches the schema.
