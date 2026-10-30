# 25: New outfit pieces marked in the wardrobe

**What to build:** When a student opens the wardrobe (or avatar design) after earning outfit pieces, each new piece wears a small star badge at its top right, and so does the slot button of every category holding one. A category's star goes away once the student opens that category. A piece's star shows while its category is open, and is gone the next time. Seeing a piece once is enough: the student doesn't have to put it on.

**Blocked by:** 14

**Status:** ready-for-human

- [x] A new outfit piece shows a small, gently pulsing star badge at the top right of its picture in the wardrobe. The pulse stops under `prefers-reduced-motion`, and the star stays
- [x] When the wardrobe opens, each slot button (Tops, Pants and shorts, Shoes, Hats) with a new piece in it shows the same star. Opening that slot clears the slot's star
- [x] Opening a slot marks its new pieces as seen in the wardrobe. They keep their star while that slot is open, and don't have it the next time the wardrobe opens, whether or not they were worn
- [x] Wardrobe newness is stored on the server, so it survives a reload and another device. The pieces stay new until the student opens their slot
- [x] Skin tones, hair, the base set and stickers never show the star
- [x] Rendered-app tests cover:
  - the slot star, and clearing it;
  - the piece star while its slot is open, and gone on the next visit;
  - surviving a reload.
- [x] Contract and integration tests cover marking pieces as seen in the wardrobe

## Design notes

- **This is separate from the locker's reveal.** Ticket 14's `seenAt` is set when the student taps the tick on the reveal, so it's already set by the time they reach the wardrobe. Add a second marker per reward, e.g. `Reward.wardrobeSeenAt`. Two options for the API:
  - extend `GET /locker` with something like `newInWardrobe: string[]` (outfit item IDs);
  - add a `POST /locker/wardrobe-seen`, or widen `POST /locker/seen` with a `where` field.
  Either way, the `LockerPort` and the contract suite change, and both the stand-ins and the real adapter meet it.
- **When to mark them seen:** mark a slot's new pieces as seen when the slot opens, not when the wardrobe closes, so leaving with the back button still counts. Keep their stars in the UI for as long as that slot stays open (hold the new set in component state from when the wardrobe loaded).
- **Badge:** the badge is decorative, so it shouldn't be spoken as a separate label. Add "new" to the button's accessible name, e.g. "Hats, new". That's a new shell string, so the founder runs `pnpm voice`.
- **The first visit:** avatar design on a student's first visit has no rewards yet, so in practice this only shows in the wardrobe. Build it in the shared `AvatarDesign` anyway.
- **Where the star art lives:** reuse the sticker placeholder `star` shape, or an `@repo/ui` icon, in the student tone. Colours come from tokens, and the badge sits inside the button's box so the touch target doesn't change.

## Comments

**Agent, 2026-10-30:** Built; over to the founder to check and commit.

- **Schema:** migration `wardrobe_seen` adds `Reward.wardrobeSeenAt`. It marks every reward that already exists as seen, so only rewards granted from now on get a star.
- **API:**
  - `GET /locker` also returns `newInWardrobe`: outfit pieces only, in the order they were granted.
  - New `POST /locker/wardrobe-seen` (`markSeenInWardrobe`) takes the same `{ rewards }` body as `/locker/seen`.
  - The two markers are independent: the locker reveal doesn't clear a wardrobe star, and opening a slot doesn't clear a reveal.
- **Port:**
  - `Locker.newInWardrobe` and `LockerPort.markSeenInWardrobe` are new.
  - The real adapter and the stand-in both have them.
  - `standInGrant` takes `wardrobeSeen`, which matches `seen` unless set.
- **Wardrobe** (shared `AvatarDesign`):
  - The new set is held from load for the whole visit.
  - A slot's new pieces are marked seen when the slot opens, once per visit, without waiting on the answer. If marking fails, the error is logged and the stars come back next time.
  - The wardrobe opens on Tops, so new tops are marked seen at once, and the Tops slot never shows a star.
  - The star is a 24 px circle in the student tone, with a `@repo/ui` star, inside the button's corner. It pulses only without `prefers-reduced-motion`.
  - Buttons with a star are named "Hats, new" or "Hats 30, new", using the new shell string `is-new`.
- **Proof:**
  - 6 API tests in `rewards.test.ts`, and the new-locker test now expects `newInWardrobe: []`.
  - 2 new contract cases and 1 extended case, each run against both implementations.
  - 4 rendered-app tests in `Locker.test.tsx`: the slot star and clearing it; the piece star staying for the visit and gone on the next one; a slot's star surviving a reload; nothing marked when nothing is new.
  - Breaking each guard made a test fail: the slot star never clearing, never marking, no piece star, stickers counted as new, and wardrobe-seen also clearing the reveal (both in the API and in the stand-in).
  - The api (276) and play (354) suites pass. So do `check-types` for api, play, teach and api-client, and Biome on the changed files.
  - Headless Chrome at 1366×768 and 744×1133: no horizontal scroll; slot buttons stay 72 px with the 24 px star inside them. 360 px now shows the too-small screen.
- **The founder needs to:**
  - apply the migration (`pnpm dev`);
  - run `pnpm generate` so the API client has `newInWardrobe` and `markSeenInWardrobe` (the generated files are gitignored);
  - run `pnpm voice` for the new shell string `is-new` ("new"), then listen and commit. `check-voice` fails until then.

**Agent, 2026-10-30:** At the founder's request, a new piece's star also goes as soon as the student puts it on, for the rest of that visit. Taking it off again doesn't bring the star back. Covered by a rendered-app test in `Locker.test.tsx`.
