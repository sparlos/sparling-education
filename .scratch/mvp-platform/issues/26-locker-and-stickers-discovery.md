# 26: What the locker is, and how stickers work on it

**What to build:** Nothing yet. This is discovery: a grilling session with the founder to decide what the locker is and how decorating it with stickers should work, before any more is built. Load the `mattpocock-skills:grilling` skill first and follow it.

**Type:** grilling

**Blocked by:** 15

**Status:** done

## Where things stand

- "The locker" is currently the student's whole home screen: their avatar (which opens the wardrobe), the class's games, and since ticket 15, a "Your stickers" section. That section is a sunken panel the student sticks stickers on, with a tray of loose stickers under it (`apps/play/src/ui/Locker.tsx`, `Stickers.tsx`).
- Placing works by tap-then-tap or by dragging. Placements are saved as x/y fractions of the panel, with a stacking order (`StickerPlacement` in the schema, `PUT /locker/stickers`).
- Recognition stickers are gold rosettes, revealed over the home screen with the rewards.
- The glossary (`docs/GLOSSARY.md`) defines a sticker as "a reward a student places on their locker to decorate it".

## The founder's idea

The home screen and the locker might be two different things. The locker could be its own view or area that looks like an actual locker, which the student decorates, rather than the name for the whole screen. Grill this until it's settled.

## Questions to cover

These are a starting point, not a script. Ask one at a time.

- **Naming:** what's the home screen called if "locker" means the decorated thing? Does the glossary (and the spec, DESIGN.md and marketing copy, which all say "locker") need to change? Consider the `mattpocock-skills:domain-modeling` skill for the glossary.
- **Where it lives:** is the locker its own screen (like the wardrobe), an area on the home screen, or the home screen's background? How does a student get there and back, without reading?
- **What it looks like:** a locker door, an open locker with shelves, or something else? What's the art direction, given that the illustrator's style kit doesn't exist yet? Does the avatar appear in it?
- **Decorating:** is it free placement anywhere, fixed slots, or both? Can stickers rotate, resize or overlap? Is there a limit? What happens to stickers already placed under ticket 15, if the surface changes shape?
- **Recognition:** should recognition stickers have a place of honour (a shelf or frame) rather than being one sticker among many?
- **Outfits and other rewards:** does the wardrobe belong inside the locker? Does the glossary's "piece of furniture" reward point to the locker as a space that grows?
- **Privacy and sharing:** the spec says the locker is private. Should a decorated locker ever be visible to classmates, the teacher, or a parent later? Or is that firmly out of scope for the MVP?
- **Grade 3 usability and Chromebooks:** touch targets, everything spoken, and performance on old devices.
- **Scope:** what's in the MVP, and what waits for the class world?

## Done when

- The decisions are written up under `## Answer` in this file, with anything rejected and why.
- The glossary, spec and design doc changes the decisions imply are listed (or made, if the founder agrees during the session).
- Follow-up build tickets are written with the next free numbers, each `ready-for-agent` or `ready-for-human`, replacing or reworking ticket 15's sticker UI as needed.

## Out of scope

- Any implementation, prototype or art. If the session needs a quick look to decide, note it as a follow-up `prototype` ticket.

## Answer

Grilled with the founder on 2026-10-31.

### Decisions

1. **Home and the locker are two things.** **Home** is the student's screen: their avatar (which opens the wardrobe), a small picture of their locker, the class's games, and the reveal of new rewards. The word "home" is spoken too ("Go home"). **Locker** means only the thing a student decorates.
2. **The locker is its own screen**, like the wardrobe. The small locker on home shows the front of the door with its stickers, and tapping it opens the locker screen. A spoken button goes back home.
3. **It looks like a real locker that opens.** The screen opens on the closed door, seen from the front. Tapping the handle (a big target, spoken: "Open your locker") swings the door open, and tapping it again closes it. One view shows at a time: the front of the door, or the inside of the door with the locker's inside next to it.
4. **Stickers go on the front of the door or the inside of the door.** Each sticker the student owns is placed once, on one of the two surfaces. Stickers can be moved but not rotated or resized. Each one gets a small random tilt when placed, which the student doesn't control. Stickers can overlap, and the newest one sits on top. There's no limit beyond the stickers the student owns. To move a sticker to the other surface, the student drags it back to the tray, then places it again. The tray of stickers not yet placed sits below the door, whether it's open or closed.
5. **Recognition stickers are placed like any other sticker.** They stand out through their art alone (a gold rosette). There's no place of honour.
6. **The rest of the inside is fixed: a keepsake for each game played.** A **keepsake** is one fixed object for each game a student has played, whatever the effort. It shows where they've been, never how well they did. It isn't a reward, doesn't count toward the weekly cap, and can't be moved or removed.
7. **How a student finds a new keepsake:** the small locker on home glows while there's a new keepsake *or* a sticker not yet placed. The new keepsake gets a little moment when the door opens. Rewards are still revealed on home, as they are today.
8. **The wardrobe stays separate**, opened from the avatar on home. The avatar doesn't appear in the locker.
9. **The locker is private.** No classmates, teachers or parents see it in the MVP. The only exception is the demo class's "View as a student", which shows simulated students.
10. **The art is placeholder SVG in named slots** until the illustrator's style kit exists: the front of the locker, its inside (door and shelves), the small locker on home, and **one keepsake slot per game**, kept in the shell next to the game's card art. A game without keepsake art gets a tinted placeholder object in its class's colour.
11. **No migration.** Treat stickers as if ticket 15's placements never existed. Wipe all demo and test data. The sticker and keepsake schema can be redesigned from scratch.
12. **Usability:** every label and action is spoken, the shell's existing touch-target sizes apply, and the door swing is CSS or SVG, which is cheap on old Chromebooks and respects `prefers-reduced-motion`.
13. **The MVP is all of the above.**

### Rejected, and why

- **Keeping "locker" as the name of the whole screen.** A child pictures a locker as a thing you decorate, not a screen you pick games from.
- **"Hallway" or "base" for home.** Hallway commits us to a scene we haven't designed, and base or lobby are vaguer for a Grade 3 student. A later class-world **house** needs to stay clearly different from **home**.
- **Decorating on home itself, or making the locker home's background.** Home is busy with games and reveals, and decorating needs room and calm.
- **Trophies for doing well in a game.** They break "rewards come only from effort", and they'd leave the shelves of struggling students empty.
- **A fixed place of honour for recognition stickers.** The founder wants students to place them like any other sticker. The art makes them stand out.
- **Rotate, resize or pinch controls.** Too fiddly for small fingers, and each one needs spoken controls.
- **Showing the front and the inside at once.** It's quicker for moving stickers, but it doesn't feel like a locker.
- **The wardrobe reached from inside the locker** (a mirror or hook). It would duplicate the avatar's control on home.

### Later, not in the MVP

- Effort trophies, which would be a third kind of reward with its own catalogue and cap rules
- Showing off a locker, which belongs with the class world and its visits
- Furniture
- Real art from the style kit

### Doc changes

- `docs/GLOSSARY.md`: **Home** (new), **Locker** (redefined) and **Keepsake** (new). Class join link, game link and wardrobe now say "home". *(Done.)*
- `.scratch/mvp-platform/spec.md`: the overview, the student stories (13 reworded, 13a added, 14 reworded), the links, locker state, keepsakes, the marketing line and testing. *(Done. The code names `LockerPort` and "locker port" are left for ticket 31.)*
- `docs/DESIGN.md`: home, the locker, keepsakes, the student journey and continuity. *(Done.)*
- `apps/web/content/parents.tsx`: the locker blurb. *(Done.)* The screenshots `student-locker.jpg` (home and parents pages) and their alt text need redoing once ticket 33 is built.
- Shell strings: "Your locker", "Opening your locker…", "Go to your locker" and the sticker instructions change in ticket 31 and ticket 33. The founder runs `pnpm voice` after each.

### Follow-up tickets

- 30: Prototype the locker (`prototype`)
- 31: Rename the locker screen to home (`task`)
- 32: Stickers and keepsakes schema, from scratch (`task`)
- 33: Build the locker screen (`task`), blocked by 30, 31 and 32. It replaces ticket 15's sticker panel.
