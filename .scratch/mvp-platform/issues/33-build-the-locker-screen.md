# 33: Build the locker screen

**What to build:** The locker as its own screen, reached from a small locker on home. It replaces ticket 15's sticker panel on home. Follow ticket 26's `## Answer` and ticket 30's `## Answer`. The prototype is on the `prototype/locker` branch (`apps/play/src/lab/locker/`): reuse its look and moments, but rewrite the code properly.

**Type:** task

**Blocked by:** 30, 31, 32

**Status:** ready-for-agent

- [ ] Home shows a small picture of the student's locker (the front of the door, with its stickers, each at its tilt) where the sticker panel was. Tapping it (spoken: "Your locker") opens the locker screen, and a spoken button goes back home
- [ ] The small locker glows while there's a new keepsake or an owned sticker not yet placed. The glow doesn't pulse under `prefers-reduced-motion`
- [ ] The locker screen opens on the closed door. The handle (spoken: "Open your locker" / "Close your locker") swings it open and closed. One surface shows at a time. The swing takes 700 ms (none under `prefers-reduced-motion`). Open, the door stops at an angle beside the locker, and the locker's inside is the bigger part (ticket 30's variant B)
- [ ] A sticker dropped on the angled door lands exactly where it was dropped. The prototype used the door's bounding box, which is slightly off on an angled door, so map the point through the door's transform, or draw the open door flat in a way that still looks angled
- [ ] Open: the inside of the door, and the inside of the locker with a keepsake for each game played, in fixed positions. A new keepsake gets a short moment when the door opens, after which it's marked as seen. Voice and the moment take turns (`await say`), not both at once
- [ ] The tray of unplaced stickers sits below the door in both views. Tap-then-tap or drag places a sticker on the surface showing, with its tilt. Dragging a sticker moves it, and dragging it to the tray takes it off. Recognition stickers behave the same way
- [ ] Art in named slots: `locker-front`, `locker-inside`, `locker-small`, and one `keepsake` slot per game, kept in the shell next to the game's card art. A game without keepsake art gets a tinted placeholder in its class's colour
- [ ] Every label is spoken, and new strings are added to `shell-strings.ts`. Touch targets match the shell's existing sizes
- [ ] Rendered-app tests cover: opening the locker from home and coming back; opening and closing the door; placing, moving and taking off a sticker on each surface; a sticker moving between surfaces; the glow and when it clears; a new keepsake's moment and it being marked seen
- [ ] Headless Chrome screenshots at 1366×768 and 744×1133, with no horizontal scroll (`docs/agents/frontend-testing.md`)
- [ ] Ticket 15's sticker panel code that's no longer used is removed
- [ ] The founder is told to run `pnpm voice` for the new strings, and to retake `apps/web/public/screens/student-locker.jpg` (used on the home and parents pages), updating its alt text in `apps/web/content/home.tsx` and `parents.tsx`
