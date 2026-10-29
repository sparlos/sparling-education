# 15: Stickers and recognition

**What to build:** Students place their stickers on their locker and move them around. A teacher awards a student recognition, an exclusive sticker for a character trait, in two taps, and sees which students haven't been recognised yet this term.

**Blocked by:** 14, 21

**Status:** ready-for-human

- [x] Students place, move and remove owned stickers on the locker. Placements are saved and only the owner can change them
- [x] Recognition stickers look distinct from earned stickers, and are revealed as new in the locker
- [x] The traits (provisionally kindness, perseverance and leadership) and term dates are configuration. Recognition doesn't count toward the weekly cap and games never grant it
- [x] The teacher awards recognition from the student page or the grid in two taps, and sees the "not yet recognised this term" list
- [x] Integration tests cover awards, term boundaries and that only teachers can award. Rendered-app tests cover placing stickers and awarding recognition

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit.

- **Traits:** kindness, perseverance and leadership are in `recognitionTraits` in `@repo/rewards`, with their names for teachers. Each trait has one exclusive sticker, `recognition-<trait>`. These stickers aren't in the catalogue, so effort can never grant one.
  - Their placeholder art (in `@repo/rewards/sticker`) is a gold rosette with ribbon tails and the trait's emblem: a heart, a mountain or a crown. That makes them look different from every earned sticker.
  - Adding a trait means adding its art and its spoken shell line too. The type checker flags a missing line in `recognitionLines` in `Stickers.tsx`.
- **Terms:** set in `recognitionRule` in `apps/api/src/scoring.ts`: September 1 to January 31, and February 1 to June 30, by date in Toronto. **My call:** a day between terms (the summer) belongs to the term that ended last. So recognition given in July counts toward the February–June term, and September 1 starts a fresh list.
- **The rule:** a teacher can recognise a student once per trait per term in a class.
  - Recognising them for the same trait again that term changes nothing, so a double tap is harmless.
  - The next term, it's new again: the student sees it revealed again, though they own the sticker only once.
  - Recognition is stored in its own table, so it never touches the weekly reward cap.
- **Schema:** the migration `recognition_and_placements` adds two tables:
  - `Recognition`: student, class, trait, the term's first day, when it was given, and when the student saw it.
  - `StickerPlacement`: student, sticker, x, y and stacking order.
  - I checked with `prisma migrate diff` that the migrations match the schema exactly.
- **API:**
  - New `POST /classes/{classId}/students/{studentId}/recognition` (`recogniseStudent`). It's only for the class's teacher; anyone else gets 401, 403 or 404.
  - New `PUT /locker/stickers` (`placeStickers`). It replaces every placement and only changes the signed-in student's own locker. A sticker they don't own gets a 400.
  - `GET /locker` now also returns `placements`, and includes recognition stickers in `stickers` and `unseen`. `POST /locker/seen` also marks recognition as seen.
  - The dashboard now returns `recognition` (the term and the traits), plus each student's `recognised` traits this term. The student page now returns `recognised`, every recognition given in the class, newest first.
  - `createApp` takes a `clock`, so tests can control which term it is.
- **Play shell:**
  - **Placing stickers:** the old sticker row is now a locker board with a tray under it. The student taps a sticker, then taps where it goes. A sticker already on the board moves the same way, or comes off with the "put it back" button.
  - **Dragging** works too: drag a sticker onto the board, or off it to take it off. A sticker always stays fully on the board.
  - **Saving:** each change saves at once. If a save fails, the board goes back to what's saved.
  - **Keyboard:** picking a sticker up moves focus to the board, Enter sticks it in the middle, and Escape puts it down.
  - **Voice:** each step is spoken.
  - **Reveal:** recognition shows in the reveal on a raised, outlined card. It's spoken after "You got something new!", for example "Your teacher gave you a sticker for kindness!".
  - **Stand-in sign-in:** a new checkbox gives the stand-in student four stickers and new recognition for kindness, to try it out locally.
- **Teacher app:**
  - **Grid:** each student's name cell has a subtle "Recognise" button. Two taps: the button, then the trait from its menu. The cell also shows the traits they've been recognised for this term.
  - **"Not recognised yet this term":** a new list below the grid shows the term's dates and every student not recognised yet, each with its own "Recognise" button. It says so when every student has been recognised.
  - **Student page:** a new Recognition section lists what the student was given, with dates, and has its own "Recognise" button.
  - **New in `@repo/ui`:** a `Menu` wrapper. I turned off Mantine's `hideDetached`, so the menu stays open inside the grid's sideways-scrolling container.
  - **Fake teacher port:** it holds copies of the traits and terms, and the contract suite keeps them in step with the API.
- **Tests:** all pass.

  | Area | Tests | What's new |
  | --- | --- | --- |
  | API | 223 | `recognition.test.ts`: awards, once per term, several traits, seen and new again, per-class views, term dates (including the Toronto midnight boundary and the summer), not counting toward the cap, and only teachers. `placements.test.ts`: placing, moving, taking off, recognition stickers, refusals, and only the student. |
  | Play | 313 | The locker contract against the stand-ins and the real API. Rendered tests for tapping, moving, keeping stickers on the board, putting back, keyboard, dragging, a failed save, and the recognition reveal and placement. |
  | Teacher app | 128 | A new recognition contract against the fake and the real API. Rendered tests for the menu, the not-yet list, a new term, the student page, and a failed save. |
  | Rewards | 7 | |

  Type checks for api, play, teach, ui, db, rewards and api-client pass. Biome is clean on the changed files.
- **Headless Chrome at 1366 and 360 px:** no horizontal scroll on the locker, the reveal, the dashboard or the student page. Stickers are 64 to 72 px. The "Recognise" buttons are 44 px tall, like the app's other medium buttons ("Manage class").
- **The founder needs to:**
  - apply the migration (`pnpm dev`). Prisma's client and `@repo/api-client` regenerate through turbo. No new dependencies, so no `pnpm install`;
  - run `pnpm voice` for 9 new shell lines (`stickers-how`, `sticker`, `place-sticker`, `move-sticker`, `put-sticker-here`, `sticker-back`, `recognition-kindness`, `recognition-perseverance`, `recognition-leadership`), then listen and commit. `check-voice` fails until then;
  - review the wording, especially that perseverance is spoken as "for never giving up";
  - review the rosette art, and the summer-term call above.

