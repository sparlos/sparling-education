# 30: Prototype the locker

**What to build:** A throwaway prototype of the locker screen in the play shell's prototype lab (`/play/lab`), for the founder to try and react to before ticket 33 builds it for real. Load the `mattpocock-skills:prototype` skill first. Decisions are in ticket 26's `## Answer`.

**Type:** prototype

**Blocked by:** none

**Status:** done

- [x] The closed door, seen from the front, with a big handle that swings it open and closed (CSS or SVG, with no swing under `prefers-reduced-motion`)
- [x] The open view: the inside of the door on one side, and the inside of the locker with a few placeholder keepsakes on the other
- [x] A tray of fake stickers. Tap-then-tap or drag places a sticker on whichever surface is showing, with a small random tilt. Dragging a placed sticker moves it, and dragging it to the tray takes it off
- [x] A new keepsake's moment when the door opens
- [x] The small locker as it would look on home, showing the front's stickers, and its glow
- [x] Runs at 1366×768 and 744×1133 without horizontal scroll. Fake data only, with no API or port changes

## Questions for the founder to answer by playing it

- Does the door swing feel good, and is it quick enough not to slow a student down?
- In the open view, how do the inside of the door and the inside of the locker share the screen?
- How big are the surfaces against the tray, and do the stickers feel big enough to grab?
- Is the keepsake moment and the glow on home noticeable without being noisy?

## Out of scope

- Real art, persistence, voice recordings (browser speech is fine), and tests

## Answer

Played by the founder on 2026-10-31. The prototype is kept off main, on the `prototype/locker` branch (`ab1ce1a`, `apps/play/src/lab/locker/`).

- **Swing:** 700 ms.
- **Open view: variant B, "Locker first".** The door stops at an angle (about 130°), so the inside of the door is the smaller part and the locker's inside, with its shelves of keepsakes, is the bigger part. The tray stays below the door, as ticket 26 decided.
- **Keepsake moment and glow:** good as they are. When the door opens, the new keepsake pops on its shelf with a gold ring, then the voice says what it is. The small locker on home has a slow gold glow that stays still under `prefers-reduced-motion`.
- **Surfaces against the tray:** no change asked for, so keep the prototype's sizes. Stickers are a fifth of the door's width, and the tray's stickers are 72 px buttons.

## Comments

**Agent, 2026-10-31:** Built at `apps/play/src/lab/locker/`, on the `prototype/locker` branch. Play it at `/play/lab/locker` with `pnpm --filter play dev`. Three variants of the open view, switched with ← → or the bar at the bottom (`?variant=A|B|C`):

- **A, Even split:** the door swings 180° and lies flat beside the locker, so both are the same size. The tray is below.
- **B, Locker first:** the door stops at an angle, so the locker's inside is the bigger part. Stickers on the angled door land a little off where you drop them, which is a prototype shortcut.
- **C, Tray beside:** like A, but in landscape the tray is a column on the right, so the locker gets the full height. This tests ticket 26's "tray below the door".

The dev buttons at the top right add a sticker or a new keepsake, cycle the swing speed (300, 450 or 700 ms), and reset. The line under them shows the state. Home has the small locker with its glow.

The lab needed one change: `isShellScreen` in `PrototypeMeta` lets a prototype target no curriculum, and the grounding test and the list skip those checks for it. Checked in headless Chrome at 1366×768 and 744×1133, with no horizontal scroll and no page errors. The handle is at least 82 px tall, and dragging and tap-then-tap both place stickers on each surface. Types, Biome and the lab tests pass.

Next: the founder plays it and answers the questions above. Then the verdict goes here, the prototype is committed to `prototype/locker` and stays off main, and ticket 33 builds the chosen layout.
