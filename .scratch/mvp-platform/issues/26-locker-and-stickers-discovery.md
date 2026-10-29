# 26: What the locker is, and how stickers work on it

**What to build:** Nothing yet. This is discovery: a grilling session with the founder to decide what the locker is and how decorating it with stickers should work, before any more is built. Load the `mattpocock-skills:grilling` skill first and follow it.

**Type:** grilling

**Blocked by:** 15

**Status:** ready-for-human

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
