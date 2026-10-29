# 24: Load only the plays scoring uses, and show the latest play first

**What to build:** Teachers' views stay fast as play history grows. The dashboard and a cell's evidence load only the records their results are scored from, not every record a class has ever made. A cell's evidence also lists plays newest first: the play a teacher most wants to see is the one just played.

**Blocked by:** none

**Status:** ready-for-agent

## Why

The dashboard (`apps/api/src/dashboard.ts`) loads every record of every student in the class, then scores them in memory. Scoring only uses each student's 5 most recent plays per expectation and tier grade (`understandingRule.recentPlays`), and per game for the misconception strip (`misconceptionRule.recentPlays`), so almost everything loaded is thrown away. Since ticket 23, Fraction Hop sends an attempt for every run, about 3–5× the records per play. A class of 30 over a school year is roughly 90k rows per dashboard load.

Pagination isn't the fix. The dashboard is a grid of about 30 students, so its response is already small; the cost is in what the query loads.

## Design notes

- **The query must give the same results as today.** Which plays count isn't simply "the last 5": crashed plays and plays with nothing but exploring don't count, and the window is per expectation and tier grade (and per game for misconceptions). Either filter by those same rules in the query, or load a safe margin of each student's recent plays and let `scoring.ts` choose as it does now. The rules stay in `scoring.ts` (ADR 0002); the query must not grow a second copy of them that can drift.
- A crash that arrives later drops its play from the result (`dashboard.test.ts`: "drops a play from its result when its crash arrives later"). Whatever the query picks has to keep that true.
- Add an index that serves the new query (for example on class, student and device time). Schema changes go through `packages/db` (see `docs/agents/testing.md`).
- Don't store computed results yet. Revisit if this isn't enough once the pilot has real data.

## Acceptance

- [ ] The dashboard loads only the records of the plays its results and misconception strip can use, plus any margin the design needs, not the class's whole history
- [ ] A cell's evidence (`GET …/students/{student}/expectations/{id}`) does the same for its results. It still lists every play with evidence, including the ones its result doesn't count (marked as today)
- [ ] A cell's evidence lists plays **newest first**, in the API (`schemas.ts`, `drill-down.ts`, `openapi.json`) and in the teacher app (`Evidence.tsx`'s "Plays, oldest first" region, the port's doc comment, the fake and the contract suite). Classes stay oldest first
- [ ] Every existing scoring test in `dashboard.test.ts` and `drill-down.test.ts` passes unchanged, apart from the order of plays
- [ ] New integration tests with a long history: a student with many more plays than the window, including crashed plays and exploring-only plays among the recent ones, gets the same results as with the whole history. A student whose recent plays are at another tier still gets each tier's result
- [ ] A migration adds the index the query uses
- [ ] Measure it: seed a class of 30 with a school year of Fraction Hop plays (about 100 plays each, ~30 records per play) and time the dashboard and an evidence load before and after. Put the numbers in a comment on this ticket
