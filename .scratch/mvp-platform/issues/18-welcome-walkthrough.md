# 18: Welcome walkthrough

**What to build:** A new teacher's first visit to the dashboard shows the welcome walkthrough: three steps on the demo class (share a game link, spot the misconceptions showing up in the class, view quick assess). It's skippable and can be replayed from help.

**Blocked by:** 16, 17, 21, 28

**Status:** ready-for-human

- [x] ~~Exactly three steps~~ (founder: longer is fine, across screens) Steps pointing at the real controls, including sharing a game link, the misconception strip, and quick assess
- [x] It's shown once per teacher, and skipping or finishing is remembered on the server, not in the browser
- [x] It can be replayed from help, and still works after the demo class is deleted, falling back to the teacher's own class
- [x] It's never called a "tour" in the UI or the code (that word is taken by the game playthroughs)
- [x] Rendered-app tests cover the first visit, skipping, finishing and replaying

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit. Founder's ask on top of the ticket: a longer welcome that can span screens, obviously skippable, with the spotlight-and-card look, and a way to define more walkthroughs that start as the teacher explores.

- **Look:** Mantine 9's own `Tour` component does the spotlight (page dimmed, control cut out), the card beside it, focus trap, Escape and arrow keys, and scrolling. No new package. It's wrapped as `Walkthrough` in `@repo/ui` (`walkthrough.tsx`), styled from tokens: the app's pressable buttons (48 px), a Skip link, "3 of 9", and progress dots in the walkthrough's tone. New token `color.scrim` (`--k-scrim`) for the dimming. The word "tour" appears only in that one Mantine import.
- **Framework:** `apps/teach/src/ui/walkthroughs.ts` defines them as data: an ID, the screen it starts on, and steps, each with the screen it's on and a `data-walkthrough` name to point at. A step pointing at something that isn't on its screen is left out (no demo banner on a real class, no Share on the demo class, which gets an alternative step pointing at New class). `use-walkthroughs.tsx` runs them: starts the screen's walkthrough by itself until it's seen (the welcome first, others only after it), goes between screens when a step is on another, and closes as seen if the teacher navigates away. Adding one is a new entry in `screenWalkthroughs` and `data-walkthrough` on its controls.
- **Walkthroughs today:** the welcome (9 steps on the demo class, 8 on a real class: welcome, classes, Share, misconceptions, a grid cell, quick assess, then over to quick assess's Print, back to the demo banner, then Help); and one each for the student page (3 steps), quick assess, manage and a play. Finishing the welcome also marks quick assess's as seen, since it went there.
- **Remembered on the server:** `Account.walkthroughsSeen` (new migration `20261101120000_walkthroughs`), `GET /walkthroughs` and `PUT /walkthroughs/{id}` (teachers only, IDs `[a-z0-9-]`, at most 50 per teacher). Port: `walkthroughsSeen()`, `markWalkthroughSeen()`, with a new `walkthroughsContract` against the fake and the real API.
- **Help:** a Help menu in the header on every class screen: "Show me around" (the welcome, which goes to the dashboard of the class being viewed, so it works after the demo class is deleted) and "Explain this page" where the screen has one. The header moved into the router's root route so Help can see the screen. On phones the teacher's name hides from the header to make room.
- **Tests:** 8 rendered-app tests (first visit, every step and crossing to quick assess and back, skipping, Escape, remembered across sign-in, replay from Help, fallback to a real class, a screen's own walkthrough). The other tests start with every walkthrough seen (`walkthroughsSeen` on the fake). Plus 6 API tests and the contract suite.
- **Checked:** API (253 tests), teacher app (189), types, Biome, tokens. Headless Chrome on the fake at 1366×768 and 360×640: every step's card on screen, no sideways scroll, buttons 48 px. Fixed along the way: large targets (the whole grid, the whole play) pushed the card off-screen, so those steps point at one cell or task; and on a phone a tall control is scrolled near the top to leave room for the card.
- **The founder needs to:** run `pnpm --filter @repo/db generate` and `pnpm --filter api generate && pnpm --filter @repo/api-client generate` on the Mac, and apply the migration (`pnpm dev` does it). Then look at it: `VITE_TEACH_PLATFORM=fake` starts a new teacher with nothing seen.
