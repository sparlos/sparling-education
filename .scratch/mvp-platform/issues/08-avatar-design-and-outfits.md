# 08: Avatar design and outfits

**What to build:** The first time a student arrives, they design their avatar before anything else. Afterwards, the locker's wardrobe lets them change into any outfit piece they own, and every game shows the new look.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] A first-time student is taken to avatar design before the locker, and can't skip it
- [ ] The avatar look is stored on the student and returned by the session, validated with the avatar package's look parser
- [ ] The wardrobe shows only owned outfit pieces. Every student starts with a base set
- [ ] Locker state goes through a new locker port, with a fake, a real adapter and a contract suite run against both
- [ ] Touch targets and voice follow the design rules for Grades 3–5
- [ ] Integration and rendered-app tests cover first-time design, changing outfits, and the look reaching a game
