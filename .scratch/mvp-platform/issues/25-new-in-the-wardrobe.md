# 25: New outfit pieces marked in the wardrobe

**What to build:** When a student opens the wardrobe (or avatar design) after earning outfit pieces, each new piece wears a small star badge at its top right, and so does the slot button of every category holding one. A category's star goes away once the student opens that category. A piece's star shows while its category is open, and is gone the next time. Seeing a piece once is enough: the student doesn't have to put it on.

**Blocked by:** 14

**Status:** ready-for-agent

- [ ] A new outfit piece shows a small, gently pulsing star badge at the top right of its picture in the wardrobe. The pulse stops under `prefers-reduced-motion`, and the star stays
- [ ] When the wardrobe opens, each slot button (Tops, Pants and shorts, Shoes, Hats) with a new piece in it shows the same star. Opening that slot clears the slot's star
- [ ] Opening a slot marks its new pieces as seen in the wardrobe. They keep their star while that slot is open, and don't have it the next time the wardrobe opens, whether or not they were worn
- [ ] Wardrobe newness is stored on the server, so it survives a reload and another device. The pieces stay new until the student opens their slot
- [ ] Skin tones, hair, the base set and stickers never show the star
- [ ] Rendered-app tests cover:
  - the slot star, and clearing it;
  - the piece star while its slot is open, and gone on the next visit;
  - surviving a reload.
- [ ] Contract and integration tests cover marking pieces as seen in the wardrobe

## Design notes

- **This is separate from the locker's reveal.** Ticket 14's `seenAt` is set when the student taps the tick on the reveal, so it's already set by the time they reach the wardrobe. Add a second marker per reward, e.g. `Reward.wardrobeSeenAt`. Two options for the API:
  - extend `GET /locker` with something like `newInWardrobe: string[]` (outfit item IDs);
  - add a `POST /locker/wardrobe-seen`, or widen `POST /locker/seen` with a `where` field.
  Either way, the `LockerPort` and the contract suite change, and both the stand-ins and the real adapter meet it.
- **When to mark them seen:** mark a slot's new pieces as seen when the slot opens, not when the wardrobe closes, so leaving with the back button still counts. Keep their stars in the UI for as long as that slot stays open (hold the new set in component state from when the wardrobe loaded).
- **Badge:** the badge is decorative, so it shouldn't be spoken as a separate label. Add "new" to the button's accessible name, e.g. "Hats, new". That's a new shell string, so the founder runs `pnpm voice`.
- **The first visit:** avatar design on a student's first visit has no rewards yet, so in practice this only shows in the wardrobe. Build it in the shared `AvatarDesign` anyway.
- **Where the star art lives:** reuse the sticker placeholder `star` shape, or an `@repo/ui` icon, in the student tone. Colours come from tokens, and the badge sits inside the button's box so the touch target doesn't change.
