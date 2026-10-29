# 14: Rewards from effort, revealed in the locker

**What to build:** Effort earns students outfit pieces and stickers, up to a weekly cap. When a game ends, the student returns to their locker and any new rewards are revealed. Reaching the cap is never shown to the student.

**Blocked by:** 08, 09, 13, 21

**Status:** ready-for-human

- [x] A reward catalogue holds outfit pieces and stickers, with art referenced by named placeholder slots. Grants are never random
- [x] Rewards are granted from effort up to a weekly cap kept as configuration. Home and class play count the same, and a crashed play grants nothing and takes nothing
- [x] Returning to the locker after a play reveals the rewards that play earned, and "new since you last looked" survives a reload
- [x] At the cap, play continues normally with no message about limits
- [x] Integration tests cover granting, the cap across a week and late batches. Rendered-app tests cover the reveal

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit.

- **Catalogue:** the new package `@repo/rewards` (data only, so the API can use it). Ten stickers, each drawn in a named placeholder art slot (`stickerArt`: star, heart, sun…) by `@repo/rewards/sticker`. It also holds every outfit piece outside the base set. `catalogue` is the order rewards are granted in: a sticker, then a top, bottom, shoes and hat, then round again. Within a slot it takes each shape in turn, so you don't get the same tee twice in a row in different colours. A student always gets the next items they don't own (`nextRewards`), never random ones.
- **Rule:** `rewardRule` in `apps/api/src/scoring.ts`, beside `effortRule`. Effort (improvements after a mistake, plus finished plays) earns a reward per **2 points**, up to **5 a week**. Weeks run Monday to Sunday in **America/Toronto**. All three numbers are my provisional picks, for you to tune.
- **When rewards are granted:** when a play's end record is stored (`grantRewards` in `locker.ts`). A play counts toward the week its end happened in, by device time. That week's grant is recomputed from all its ended plays, minus what's already been granted. That gives these properties:
  - A crashed play counts for nothing and never uses up anything later plays earn.
  - A grant is never taken back.
  - Home and class play share one cap.
  - A late batch is granted against the cap of the week it was played.
  - A play with no end (the tab closed) grants nothing.
- **Concurrency:** ingesting a batch now runs in one transaction that holds a per-student advisory lock, so the same effort can't be counted twice.
- **Schema:** migration `rewards` adds `Reward` (student, item, play, week, `seenAt`), with one row per item per student.
- **API:**
  - `GET /locker` now also returns `stickers` and `unseen`.
  - New `POST /locker/seen` (`markRewardsSeen`).
- **Play shell:**
  - `LockerPort` has `markSeen`, and `Locker` has `stickers` and `unseen`.
  - When the locker opens with anything unseen, it shows a reveal over it. The reveal shows each new piece on a card, with the avatar cheering, and says "You got something new!" before the locker's own line. The tick marks the rewards as seen; until then they're revealed again after a reload.
  - It reveals everything unseen, not only the `?play` play's rewards, so rewards from a play sent late still show up on a later visit. `?play` isn't read.
  - At the cap nothing shows.
  - The locker has a plain "Your stickers" row for now. Ticket 15 replaces it with placement.
  - Stand-ins: every finished play earns the next reward (`standInEarn`), so the reveal can be tried locally.
- **Tests:**
  - API: 195 tests. The new `rewards.test.ts` covers granting, nothing before the end, adding effort up across a week, left and crashed plays, idempotent resends, home and class against one cap, the cap, the next week, the Sunday/Monday boundary in Toronto, late batches into a week with and without room, seen/unseen, and only-students.
  - Play: 296 tests. The locker contract (stand-ins and real adapters) covers earning, unseen and marking seen. Rendered-app tests cover the reveal, speech order, putting rewards away, surviving a reload, no reveal at the cap, the sticker row, and an end-to-end play → locker reveal.
  - Rewards package: 6 tests.
  - Type checks for api, play, teach, db and rewards pass. Biome is clean on the changed code.
  - Headless Chrome at 1366 and 360 px: no horizontal scroll, Done is 64 px and hear-again is 48 px.
- **The founder needs to:**
  - run `pnpm install` (new workspace package; `pnpm-lock.yaml` is updated);
  - apply the migration (`pnpm dev`);
  - run `pnpm voice` for 4 new shell lines (`new-reward`, `new-outfit`, `new-sticker`, `stickers`), then listen and commit. `check-voice` fails until then;
  - review the cap numbers and the placeholder sticker shapes.
