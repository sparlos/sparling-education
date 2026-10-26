# 07: A student joins and plays from the locker

**What to build:** A student opens a class join link, signs in with Google, and joins the class. In a split-grade class they tap their grade once. They land in their locker, which lists the class's games, and tapping one opens it at the tier for their grade.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Signing in through a class join link creates a student, or reuses an existing one, and creates their membership. A teacher account can't join as a student
- [ ] Membership holds the student's grade in that class. It's set automatically in a single-grade class. In a split-grade class the student picks from the class's grades with large buttons that are also spoken
- [ ] `GET /session` returns the shape the play shell's `SessionPort` expects, with a real adapter that passes the existing session contract suite. Signed out returns null, and other failures show "try again"
- [ ] A minimal locker in the play shell lists the games of every class the student is in that are turned on, and opens one at the right tier, recording which class it was opened for
- [ ] The play shell chooses stand-ins or real adapters by environment variable, and the stand-ins remain for API-less development
- [ ] The locker stays within the play shell's Chromebook budgets and works without reading (every label is spoken)
- [ ] Integration tests cover joining, grade setting, multiple classes and session. Rendered-app tests cover the grade pick and opening a game from the locker
