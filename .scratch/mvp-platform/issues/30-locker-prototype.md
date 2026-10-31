# 30: Prototype the locker

**What to build:** A throwaway prototype of the locker screen in the play shell's prototype lab (`/play/lab`), for the founder to try and react to before ticket 33 builds it for real. Load the `mattpocock-skills:prototype` skill first. Decisions are in ticket 26's `## Answer`.

**Type:** prototype

**Blocked by:** none

**Status:** ready-for-agent

- [ ] The closed door, seen from the front, with a big handle that swings it open and closed (CSS or SVG, with no swing under `prefers-reduced-motion`)
- [ ] The open view: the inside of the door on one side, and the inside of the locker with a few placeholder keepsakes on the other
- [ ] A tray of fake stickers. Tap-then-tap or drag places a sticker on whichever surface is showing, with a small random tilt. Dragging a placed sticker moves it, and dragging it to the tray takes it off
- [ ] A new keepsake's moment when the door opens
- [ ] The small locker as it would look on home, showing the front's stickers, and its glow
- [ ] Runs at 1366×768 and 744×1133 without horizontal scroll. Fake data only, with no API or port changes

## Questions for the founder to answer by playing it

- Does the door swing feel good, and is it quick enough not to slow a student down?
- In the open view, how do the inside of the door and the inside of the locker share the screen?
- How big are the surfaces against the tray, and do the stickers feel big enough to grab?
- Is the keepsake moment and the glow on home noticeable without being noisy?

## Out of scope

- Real art, persistence, voice recordings (browser speech is fine), and tests
