# 09: Game links, and returning to the locker

**What to build:** A game link from a teacher signs the student in if needed, joins them to its class if they aren't in it, and opens the game. When any game ends, the student is back in their locker.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] A game link carries its class. Opening it signed out goes to sign-in and then straight back to it
- [ ] A student not in the class is joined to it first, including the split-grade pick, and the play records that class
- [ ] The game link no longer has a portal parameter, and `LinksPort.hub` is replaced by a link to the locker that names the play (ready for ticket 14's reveal)
- [ ] A game link for a game that's turned off, or a bad join code, shows a plain spoken message and a way to the locker
- [ ] The play shell's route tests and end-to-end test are updated, and the integration tests cover joining through a game link
