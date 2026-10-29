# 24: Load only the plays scoring uses, and show the latest play first

**What to build:** Teachers' views stay fast as play history grows. The dashboard and a cell's evidence load only the records their results are scored from, not every record a class has ever made. A cell's evidence also lists plays newest first: the play a teacher most wants to see is the one just played.

**Blocked by:** none

**Status:** ready-for-human

## Why

The dashboard (`apps/api/src/dashboard.ts`) loads every record of every student in the class, then scores them in memory. Scoring only uses each student's 5 most recent plays per expectation and tier grade (`understandingRule.recentPlays`), and per game for the misconception strip (`misconceptionRule.recentPlays`), so almost everything loaded is thrown away. Since ticket 23, Fraction Hop sends an attempt for every run, about 3–5× the records per play. A class of 30 over a school year is roughly 90k rows per dashboard load.

Pagination isn't the fix. The dashboard is a grid of about 30 students, so its response is already small; the cost is in what the query loads.

## Design notes

- **The query must give the same results as today.** Which plays count isn't simply "the last 5": crashed plays and plays with nothing but exploring don't count, and the window is per expectation and tier grade (and per game for misconceptions). Either filter by those same rules in the query, or load a safe margin of each student's recent plays and let `scoring.ts` choose as it does now. The rules stay in `scoring.ts` (ADR 0002); the query must not grow a second copy of them that can drift.
- A crash that arrives later drops its play from the result (`dashboard.test.ts`: "drops a play from its result when its crash arrives later"). Whatever the query picks has to keep that true.
- Add an index that serves the new query (for example on class, student and device time). Schema changes go through `packages/db` (see `docs/agents/testing.md`).
- Don't store computed results yet. Revisit if this isn't enough once the pilot has real data.

## Acceptance

- [x] The dashboard loads only the records of the plays its results and misconception strip can use, plus any margin the design needs, not the class's whole history
- [x] A cell's evidence (`GET …/students/{student}/expectations/{id}`) does the same for its results. It still lists every play with evidence, including the ones its result doesn't count (marked as today)
- [x] A cell's evidence lists plays **newest first**, in the API (`schemas.ts`, `drill-down.ts`, `openapi.json`) and in the teacher app (`Evidence.tsx`'s "Plays, oldest first" region, the port's doc comment, the fake and the contract suite). Classes stay oldest first
- [x] Every existing scoring test in `dashboard.test.ts` and `drill-down.test.ts` passes unchanged, apart from the order of plays
- [x] New integration tests with a long history: a student with many more plays than the window, including crashed plays and exploring-only plays among the recent ones, gets the same results as with the whole history. A student whose recent plays are at another tier still gets each tier's result
- [x] A migration adds the index the query uses
- [x] Measure it: seed a class of 30 with a school year of Fraction Hop plays (about 100 plays each, ~30 records per play) and time the dashboard and an evidence load before and after. Put the numbers in a comment on this ticket

## Comments

### 2026-10-29: built, with measurements

**How it picks plays.** The dashboard first asks Postgres for the class's records grouped by the fields choosing plays depends on (`choosingFields` in `scoring.ts`), keeping each group's earliest `at` and `sequence`: about 3 rows per play instead of ~30. `playsCounted` in `scoring.ts` runs the same `recentAtTiers`/`recentOfGames` that `understandingOf` and `misconceptionsOf` use over those rows, so the rules have one copy. Then only those plays' records load (150 plays for 30 students). A crash arriving later is just another group row, so the window moves back as before. Tier grade comes from the manifests, so the window couldn't be done in SQL without copying the rules anyway.

**Evidence** loads only plays with an attempt at the expectation, since it lists every one of them. Fraction Hop has one expectation per tier, so for it that's every play at that tier: no real saving there, by design. Both loads also leave out `asked`, `detail` and `receivedAt`.

**Index:** `PlayRecord_choosing_idx` on class, student and the choosing fields plus `at` and `sequence`, so the grouping reads only the index (a narrower index on class, student and play made no measurable difference). It has to track `choosingFields`; there's a comment on it in the schema.

**Measured** (seed: 30 students × 100 Fraction Hop plays, ~28 records per play, 5% crashed, 5% exploring-only = 83,882 rows in the class, interleaved with 7 other classes the same size = 671k rows in the table; Postgres 17 in Docker; median of 10):

| | before | after |
|---|---|---|
| Dashboard | 791 ms | 101 ms |
| A cell's evidence | 22 ms | 21 ms |

The dashboard output was byte-identical to the old code, and every student's evidence was identical apart from the play order.
