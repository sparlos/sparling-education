# 32: Stickers and keepsakes, from scratch

**What to build:** The data and API behind the new locker: sticker placements on two surfaces with a tilt, keepsakes, and what makes the small locker glow. Treat ticket 15's placements as if they never existed (ticket 26, decision 11). Wipe all demo and test data, and redesign the schema freely.

**Type:** task

**Blocked by:** 31

**Status:** ready-for-agent

- [ ] A placement records the sticker, its **surface** (the front or the inside of the door), its centre as fractions of that surface, its stacking order, and its **tilt** (a small angle chosen when it's placed, e.g. within ±8°). Each owned sticker has at most one placement. Moving it keeps its tilt, and taking it off and placing it again picks a new one
- [ ] Keepsakes: a student has one for each game they've played. Decide whether to compute them from play records (a game with any play record by the student) or store them when a play ends; computing them is simpler if it's cheap. They never depend on effort or understanding, and don't count toward the weekly cap
- [ ] "New" for keepsakes: a keepsake is new until the student opens the locker's door after getting it. An API call marks keepsakes as seen
- [ ] The locker's contents (from the port) include placements, keepsakes and which keepsakes are new, so home can show the glow: there's a new keepsake *or* an owned sticker with no placement
- [ ] Only the student changes their placements. Placing a sticker the student doesn't own, or one outside the surface, is refused
- [ ] One migration drops or recreates the old placement data. Demo class generation makes keepsakes and placements fit the new shape. Existing demo and test data is wiped, not migrated
- [ ] API tests run against the test Postgres (`docs/agents/testing.md`). Contract suite cases for the port run against both the stand-in and the real adapter
- [ ] The founder is told to apply the migration (`pnpm dev`) and run `pnpm generate`

## Notes

- Today: `StickerPlacement` in `packages/db/prisma/schema.prisma`, `PUT /locker/stickers` in `apps/api/src/locker.ts`, and the locker port in `apps/play/src/platform/ports.ts`. Use whatever names ticket 31 settled on.
