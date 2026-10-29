# 27: The demo class, with every game

**What to build:** Once all five games are hosted, rebuild the demo class's data (ticket 17) so it shows what a teacher's class looks like with the whole strand in play, not just Fraction Hop. Each new game's simulator already feeds the demo class automatically. This ticket checks that the result reads like a real class, and tunes it where it doesn't.

**Blocked by:** 17, and the other four games built and hosted in the API (`hosted(manifest, simulate)` in `apps/api/src/games.ts`)

**Status:** ready-for-agent

- [ ] Every hosted game has plays in the demo class at each grade its tiers cover, with its own misconceptions showing up in the strip, several students sharing each one
- [ ] Students differ from game to game the way real ones do: someone strong in fractions can struggle with division. Today a student's accuracy and held misconceptions are the same for every game (`demoStudents` in `apps/api/src/demo.ts`)
- [ ] Plays are spread over the weeks like a class working through the strand (a few games at a time, not every game every day), and the number per student stays plausible
- [ ] Rewards and effort still look like a real class's: check how often the weekly cap is hit with five games' plays
- [ ] Making it at first sign-in stays quick. Today it takes about 0.7 s with one game. If five games make it slow, seed it off the sign-in request without the teacher ever seeing an empty class
- [ ] The fake teacher port's demo class (`apps/teach/src/platform/fake/demo.ts`) gets plays of the new games too, so the app shows the same picture on the fake platform
- [ ] The welcome walkthrough's steps (ticket 18) still land on something worth showing: a game link, a strip with clear misconceptions, and a filled quick assess
- [ ] `demo.test.ts` and `demoClassContract` check every hosted game rather than Fraction Hop by name
