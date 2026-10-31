# 31: Rename the locker screen to home

**What to build:** What students see and hear, and the code, call the student's screen **home**, not the locker (glossary: **Home**, **Locker**). This is a rename only, with no change in behaviour: today's sticker panel stays where it is until ticket 33 replaces it.

**Type:** task

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Shell strings: "Your locker" becomes "Home" (or "Your home"), "Opening your locker…" becomes "Opening your home…", and "Go to your locker" becomes "Go home". The sticker instruction strings stay, since they really are about the locker
- [ ] Code names follow the glossary: the screen's component, route helpers (`lockerPath`, `lockerGamePath`), CSS modules, test names, and the `locker-card` art slot (which becomes e.g. `home-card`). Rename the port and API (`LockerPort`, `GET /locker`, `POST /locker/seen`) to whatever fits best. The parts that hold the locker's own contents (sticker placements, keepsakes) can keep "locker"
- [ ] Comments and docs in the touched code say "home" where they mean the screen
- [ ] The student's path in URLs, if it contains "locker", is renamed too (nothing has launched, so no redirect is needed)
- [ ] All suites, `check-types` and Biome pass in a scratch copy
- [ ] The founder is told to run `pnpm voice` for the changed strings, then listen and commit (`check-voice` fails until then), and to run `pnpm generate` if the API's names changed

## Notes

- `grep -rli locker` finds about 50 source files across `apps/play`, `apps/api`, `apps/teach` and `packages`. Leave the generated API client to `pnpm generate`.
- The teacher app's "View as a student" opens home.
