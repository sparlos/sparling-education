# 02: Rewrite the marketing site for the MVP

**What to build:** The public site describes what pilot teachers will actually get. The class world, houses, visits, portals and the parent view are no longer promised. The site leads with games where the concept is the mechanic, the misconceptions a teacher can act on, and quick assess. One line says what's coming next.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The site description, home hero and home feature sections no longer mention a 3D or shared class world, houses, portals or visits
- [x] The students page offers the locker, the avatar and outfits, stickers, and rewards for trying. No houses, visits or portals
- [x] The parents page explains rewards for effort and recognition stickers without houses. The parent-view promise is moved to the "coming next" line
- [x] The comparison table's world row is replaced by a row about misconceptions or quick assess. Competitors are still never named
- [x] The educators page mentions the misconception view and quick assess, and has one "coming next" line naming the class world and the parent view, shaped by pilot teachers
- [x] The placeholder labels and alt text for world and house renders now describe locker and dashboard images
- [x] The copy uses the marketing site's glossary terms (Teacher, Educator, Pilot…) and the product glossary terms (locker, sticker, quick assess)
- [x] The site's type check and build pass in the scratch copy

## Comments

- 2026-10-26 (agent): Done. Copy in `apps/web/content/` rewritten; the comparison row is now `misconceptions` ("Shows you the misconceptions"). The "coming next" line is a new educators FAQ, "What's coming next?". Beyond the checklist: the privacy page dropped its nickname and preset-phrase claims, the "lighter/simpler mode for slower devices" claims went (out of scope in DESIGN.md), the fractions pillar now describes Fraction Hop instead of the rejected plank bridge, and the pilot CTA now says the first five games are for Grades 3–5 math. Type check, build and Biome pass in the scratch copy.
