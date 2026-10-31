# 33: Build the locker screen

**What to build:** The locker as its own screen, reached from a small locker on home. It replaces ticket 15's sticker panel on home. Follow ticket 26's `## Answer` and ticket 30's `## Answer`. The prototype is on the `prototype/locker` branch (`apps/play/src/lab/locker/`): reuse its look and moments, but rewrite the code properly.

**Type:** task

**Blocked by:** 30, 31, 32

**Status:** ready-for-human

- [x] Home shows a small picture of the student's locker (the front of the door, with its stickers, each at its tilt) where the sticker panel was. Tapping it (spoken: "Your locker") opens the locker screen, and a spoken button goes back home
- [x] The small locker glows while there's a new keepsake or an owned sticker not yet placed. The glow doesn't pulse under `prefers-reduced-motion`
- [x] The locker screen opens on the closed door. The handle (spoken: "Open your locker" / "Close your locker") swings it open and closed. One surface shows at a time. The swing takes 700 ms (none under `prefers-reduced-motion`). Open, the door stops at an angle beside the locker, and the locker's inside is the bigger part (ticket 30's variant B)
- [x] A sticker dropped on the angled door lands exactly where it was dropped. The prototype used the door's bounding box, which is slightly off on an angled door, so map the point through the door's transform, or draw the open door flat in a way that still looks angled
- [x] Open: the inside of the door, and the inside of the locker with a keepsake for each game played, in fixed positions. A new keepsake gets a short moment when the door opens, after which it's marked as seen. Voice and the moment take turns (`await say`), not both at once
- [x] The tray of unplaced stickers sits below the door in both views. Tap-then-tap or drag places a sticker on the surface showing, with its tilt. Dragging a sticker moves it, and dragging it to the tray takes it off. Recognition stickers behave the same way
- [x] Art in named slots: `locker-front`, `locker-inside`, `locker-small`, and one `keepsake` slot per game, kept in the shell next to the game's card art. A game without keepsake art gets a tinted placeholder in its class's colour
- [x] Every label is spoken, and new strings are added to `shell-strings.ts`. Touch targets match the shell's existing sizes
- [x] Rendered-app tests cover: opening the locker from home and coming back; opening and closing the door; placing, moving and taking off a sticker on each surface; a sticker moving between surfaces; the glow and when it clears; a new keepsake's moment and it being marked seen
- [x] Headless Chrome screenshots at 1366×768 and 744×1133, with no horizontal scroll (`docs/agents/frontend-testing.md`)
- [x] Ticket 15's sticker panel code that's no longer used is removed
- [x] The founder is told to run `pnpm voice` for the new strings, and to retake `apps/web/public/screens/student-locker.jpg` (used on the home and parents pages), updating its alt text in `apps/web/content/home.tsx` and `parents.tsx`

## Comments

**Agent, 2026-10-31:** Built; over to the founder to check and commit.

- **Where it is:** the locker is its own page at `/play/locker` (`lockerPath`, route kind `locker`), drawn by `Locker` in `apps/play/src/ui/Locker.tsx`. `LockerPage` in `Home.tsx` loads it, like the wardrobe. The small locker on home (`SmallLocker`) sits beside the avatar in home's header. It's a link to the locker.
- **The angled door:** a sticker lands exactly where it's dropped. `locker-geometry.ts` undoes the door's CSS 3D projection (its `rotateY` about the hinge, under the box's `perspective`), instead of using the bounding box. In headless Chrome, a sticker tapped onto the open door is drawn within about 1 px of the tap at both sizes.
- **My call, the door's room:** at 744 px wide, the prototype's open door ran off the left of the screen and hid its handle. I widened the room for it (`doorRoom` 0.62 → 0.85). The angle (132°), the 700 ms swing and the sticker sizes are the prototype's.
- **Voice:** the locker says "This is your locker. Stick your stickers on its door, and tap the handle to open it." when it opens. "Hear it again" repeats it. The handle says "Open your locker" or "Close your locker". A keepsake says "You played Fraction Hop" when tapped. The moment comes after the swing and the handle's line, then the voice says "Something new in your locker, for playing Fraction Hop". The keepsake is marked seen when its moment ends. If the door closes during the moment, it stays new.
- **A keepsake for a game they no longer have:** home only knows a game's name and class colour from the student's current classes. A keepsake from a class they've left says "Something from a game you played" and is tinted in the default class colour.
- **Moving between faces:** as ticket 26 decided, a sticker goes to the other face by way of the tray, so it gets a new tilt. The door swinging puts down a sticker in hand. A sticker dropped off the door (say, on the shelves) stays where it was.
- **Art slots:** `locker-front`, `locker-inside` and `locker-small` in `locker-art.tsx`. `keepsake` is in `home-art.tsx`, next to `home-card`. A placeholder keepsake is a ball, jar or box, picked from the game's slug.
- **Removed:** `Stickers.tsx`, its styles in `home.module.css` and the `stickers-how` line. The recognition lines moved to `sticker-lines.ts`.
- **Checks, in a scratch copy:** play 384/384 (three runs), `check-types` and Biome clean. Headless Chrome at 1366×768 and 744×1133: home, closed, open and a placed sticker, with no horizontal scroll and no page errors. The handle is 56 px wide and 111 to 143 px tall. Tray stickers are 72 px.
- **The founder needs to:**
  - run `pnpm generate` if ticket 32's API changes aren't generated yet. The repo's `check-types` fails until then.
  - run `pnpm voice` for the new and changed shell lines, then listen and commit. New: `locker-how`, `open-locker`, `close-locker`, `locker-door`, `locker-door-inside`, `locker-shelves`, `keepsake-from`, `keepsake-from-a-game`, `new-keepsake`, `new-keepsake-from-a-game` and `opening-locker`. Changed: `place-sticker` ("Tap the door to stick it there."). `stickers-how` is gone, so its recording can be deleted. `check-voice` fails until then.
- **Marketing screenshot (done by the agent, at the founder's request):** `apps/web/public/screens/student-locker.jpg` is retaken from the stand-ins: the open locker at 1024×768 at 2×, with seven stickers on the inside of the door, three keepsakes and three stickers in the tray. Its alt text in `apps/web/content/home.tsx` and `parents.tsx` now describes the locker.

