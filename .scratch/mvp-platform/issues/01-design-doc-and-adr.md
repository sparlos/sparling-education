# 01: Update DESIGN.md and write the ADR

**What to build:** Make `docs/DESIGN.md` describe the re-scoped MVP in the spec (`../spec.md`), so agents reading it first stop building toward the class world. Record the decision to ship without the class world as ADR 0003.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The MVP "In" and "Out" lists match the spec: five Number strand games for Grades 3–5, Google sign-in, classes, the locker, rewards (outfit pieces and stickers), recognition stickers, the teacher dashboard with drill-down, quick assess as a printable screen, the demo class and the welcome walkthrough. The world, houses, visits, presence, preset phrases, emotes and nicknames are listed as later
- [x] New principle #3, "Teachers have no time", is inserted with the wording agreed in the grilling, and the later principles are renumbered
- [x] Principle 7 now reads "Games stand alone": the locker, and later the class world, are ways into games, never requirements for them
- [x] The core concepts, student loop and teacher loop describe the locker instead of the hub. Grades come from the class, with a one-time pick in split classes. Game links join their class
- [x] The open questions are updated: the second-game question is answered (five concepts), and the cap size, traits, effort weighting and understanding bands remain open
- [x] "Relationship to the existing code" reflects the play shell, Fraction Hop, the lab, the core API, the db package and the teacher app
- [x] ADR 0003 records the trade-off: a complete strand of games and teacher evidence first, the world later, and the pilot waiting for all five games. Its consequences cover the deleted code behind the `world-poc` tag and the marketing rewrite
- [x] All terms match `docs/GLOSSARY.md`

## Comments

- 2026-10-26 (agent): Done. `docs/DESIGN.md` rewritten and `docs/adr/0003-mvp-ships-without-the-class-world.md` added. Inserting the new #3 renumbers "Games stand alone" to **#8** (the "principle 7" above is the old numbering); rewards moved to #5, so `games/fraction-hop/SPEC.md` and the spec's band note were updated to match. The world's rules (houses, invites, visits, nicknames) are kept in DESIGN.md under "Later: the class world".
