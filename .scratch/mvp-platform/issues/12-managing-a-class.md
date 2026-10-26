# 12: Managing a class

**What to build:** A teacher turns games off and on for a class, changes a student's grade, removes a student, and switches between their classes.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Turning a game off removes it from students' lockers, and its game link shows the "turned off" message. Turning it back on restores both
- [ ] Changing a student's grade changes the tier of their next plays. Existing results keep their tier
- [ ] Removing a student takes them out of the class's dashboard and their locker no longer lists that class. Their results for the class are kept out of the teacher's views
- [ ] A teacher with several classes switches between them, and the dashboard shows one class at a time
- [ ] Integration and rendered-app tests cover each action and the teacher-only access rules
