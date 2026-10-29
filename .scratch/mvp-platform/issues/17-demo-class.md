# 17: Demo class

**What to build:** Every new teacher gets a demo class of about 24 simulated students across Grades 3–5, with results already in and clear misconception patterns. They can view it as one of its students, and delete it in one step.

**Blocked by:** 11, 13, 21

**Status:** ready-for-agent

- [ ] A demo class is created at a teacher's first sign-in, alongside their real classes and clearly labelled
- [ ] Its plays are generated deterministically from each hosted game's manifest (tiers, expectations, misconceptions), so a new game shows up in it automatically. The data looks plausible, and some misconceptions are shared by several students
- [ ] Demo results go through the same scoring as real ones, and demo students have effort and some rewards
- [ ] "View as a student" opens the locker as one demo student. Plays made there count only in the demo class
- [ ] Deleting the demo class removes it and everything in it in one step, and it never comes back
- [ ] Integration tests cover seeding, determinism, isolation from real classes and deletion. Rendered-app tests cover delete and view as a student
