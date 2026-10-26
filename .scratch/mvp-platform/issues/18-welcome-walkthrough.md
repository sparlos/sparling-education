# 18: Welcome walkthrough

**What to build:** A new teacher's first visit to the dashboard shows the welcome walkthrough: three steps on the demo class (share a game link, spot the misconceptions showing up in the class, view quick assess). It's skippable and can be replayed from help.

**Blocked by:** 16, 17

**Status:** ready-for-agent

- [ ] Exactly three steps, each pointing at the real control: copying a game link, the misconception strip, and quick assess
- [ ] It's shown once per teacher, and skipping or finishing is remembered on the server, not in the browser
- [ ] It can be replayed from help, and still works after the demo class is deleted, falling back to the teacher's own class
- [ ] It's never called a "tour" in the UI or the code (that word is taken by the game playthroughs)
- [ ] Rendered-app tests cover the first visit, skipping, finishing and replaying
