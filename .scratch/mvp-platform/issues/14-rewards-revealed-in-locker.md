# 14: Rewards from effort, revealed in the locker

**What to build:** Effort earns students outfit pieces and stickers, up to a weekly cap. When a game ends, the student returns to their locker and any new rewards are revealed. Reaching the cap is never shown to the student.

**Blocked by:** 08, 09, 13, 21

**Status:** ready-for-agent

- [ ] A reward catalogue holds outfit pieces and stickers, with art referenced by named placeholder slots. Grants are never random
- [ ] Rewards are granted from effort up to a weekly cap kept as configuration. Home and class play count the same, and a crashed play grants nothing and takes nothing
- [ ] Returning to the locker after a play reveals the rewards that play earned, and "new since you last looked" survives a reload
- [ ] At the cap, play continues normally with no message about limits
- [ ] Integration tests cover granting, the cap across a week and late batches. Rendered-app tests cover the reveal
