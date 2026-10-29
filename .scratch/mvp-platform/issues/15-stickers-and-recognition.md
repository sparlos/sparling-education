# 15: Stickers and recognition

**What to build:** Students place their stickers on their locker and move them around. A teacher awards a student recognition, an exclusive sticker for a character trait, in two taps, and sees which students haven't been recognised yet this term.

**Blocked by:** 14, 21

**Status:** ready-for-agent

- [ ] Students place, move and remove owned stickers on the locker. Placements are saved and only the owner can change them
- [ ] Recognition stickers look distinct from earned stickers, and are revealed as new in the locker
- [ ] The traits (provisionally kindness, perseverance and leadership) and term dates are configuration. Recognition doesn't count toward the weekly cap and games never grant it
- [ ] The teacher awards recognition from the student page or the grid in two taps, and sees the "not yet recognised this term" list
- [ ] Integration tests cover awards, term boundaries and that only teachers can award. Rendered-app tests cover placing stickers and awarding recognition
