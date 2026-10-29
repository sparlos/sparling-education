# 23: Fraction Hop records every run, and what each task asked

**What to build:** Fraction Hop uses ticket 22's fields. Every run becomes an attempt: probes as exploring tries, and misses, reruns and the solve as ordinary ones. Each attempt says what the task asked and what the run did. A teacher can then follow a task run by run, e.g. "Reach 5/4 on a course in eighths" → "Explored: hopped 1/2, stopped on 4/8" → "Not yet: hopped 1/8 + 1/8 + 1/4, splashed at 4/8" → "Got it, with a hint: hopped 1/2 + 1/2 + 1/4".

**Blocked by:** 22

**Status:** ready-for-agent

This is a spec change the founder asked for (2026-10-29). It reverses two lines of the spec: "Exactly one attempt per task" and "Runs inside a task are never separate attempts". Use the `build-game` skill for the change, starting from SPEC.md.

- [x] SPEC.md's Attempts section: an attempt is recorded for every run, and for the G5 full-plan tap. A probe is `exploring`. A miss or a rerun is `succeeded: false`, and a solve is `succeeded: true`. `assisted` on each attempt is the help that was on before that run. A misconception goes on the miss that brings it over its threshold, at most once per task, by the same rule as today (most matches, ties to the one seen first). Update the Open questions and the teacher card's "Results" line to match
- [x] `asked`, the same on every attempt in the task: the goal and the course, e.g. `Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.` Improper fractions stay improper (as the goal is shown to the student). G5 says the goal's simplest form and the ticks: `Reach 2/3 on a course in twelfths.`
- [x] `detail` per run: the hops in order and where it ended, e.g. `Hopped 1/8 + 1/8 + 1/4: splashed at 4/8.`, `…: landed past the goal, on 7/4.`, `…: stopped short, on 3/8.`, `…: reached the goal.` A rerun says `Ran the same hops again: splashed at 4/8.` The G5 full-plan tap says `Filled the course with 1/12 hops.` Amounts are in the course's ticks, as the student sees them
- [x] Generated in `src/rules/` from task state, with no React, alongside `attemptFor`. Spec tests check the wording templates against SPEC.md, as they do for strings. Rules tests cover every run kind at every tier. `mutations.ts` lists the new rules
- [x] Manifest version 2. Move version 1's manifest into the API's `earlierManifests` and the play shell's equivalent, so v1 records still validate and read as before
- [x] What this changes for results, checked with integration tests and called out to the founder: understanding is unchanged for a solved task (a miss then a solve still counts the task once). A task left after misses now shows up as "not yet", where before it left no attempt at all. The local tuning log keeps its counts
- [ ] `pnpm tour fraction-hop` passes. Add a review with the `review-game` skill, paying attention to "a probe never reaches `onAttempt` as a failure": it reaches it only as `exploring`

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit. The `review-game` review isn't done yet: the skill wants a fresh session.

- Every run sends an attempt as it happens (`src/rules/teacher.ts` for the text, `attemptFor` in `task.ts`). SPEC.md is version 2, with a table of every `asked`/`detail` form that the spec tests rebuild from the rules.
- `src/manifest-v1.ts` is version 1 frozen, in the API's `earlierManifests`. The play shell has no equivalent to update: it records only under the live manifest, and its outbox resends stored records without re-checking them.
- Results, from the integration tests in `apps/api/src/drill-down.test.ts`: a task solved after misses counts once, with the same understanding as v1's single attempt. A task left after misses now counts as "not yet" (e.g. 1 of 2 tasks, so "developing", where v1 counted only the solved one). The local tuning log is unchanged.
- Readings for the founder are in `.scratch/game-framework/build-log.md` ("Fraction Hop v2").
- Checked: game tests (99), API (148), play shell (281), types, Biome, `pnpm mutate` (36 caught or explained), `pnpm tour fraction-hop` clean, `check-voice` passes (no new spoken lines).
