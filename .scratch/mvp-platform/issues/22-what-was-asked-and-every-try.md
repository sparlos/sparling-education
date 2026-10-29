# 22: What each task asked, and every try at it

**What to build:** The play view tells a teacher only "Not yet" and "Got it". They need to see what the task asked (the fraction the student had to reach) and every try the student made at it, with what they did each time. Games can describe both in short text that the platform stores and shows to teachers, in the same way for every game. A game can also send tries that only explored. Those are shown but never scored. Game-side adoption is ticket 23.

**Blocked by:** none

**Status:** ready-for-agent

## Design (agent's call, founder deferred)

- **One stream of attempts, not a new record kind.** An attempt stays "one try at one task", and the task is still what scoring counts once. Two optional, teacher-only text fields join it, and one flag:
  - `asked`: what the task asked, the same on every attempt at the task, e.g. `Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2.`
  - `detail`: what the student did on this try, e.g. `Hopped 1/8 + 1/8 + 1/4: splashed at 4/8.`
  - `exploring: true`: a try that only explored (Fraction Hop's probe). It's neither right nor wrong, so it must have `succeeded: false`, no misconception and no help. Scoring and effort ignore it, and teachers see it as "Explored". This keeps "exploring never counts as a mistake" true while still showing every try.
- **Text, not a per-game schema.** Every game's tasks differ, so a fixed schema would either fit only fractions or grow forever. Each field is plain en-CA text, at most 200 characters, with no markup. The one convention: a fraction is written `a/b`, and a mixed number `1 3/4`. The teacher app draws those as proper fractions, so every game's detail reads the same way. Games build these strings from rules state, never from the student-facing strings: they're for teachers, never spoken, and never voiced.
- Each try is sent as it happens, as attempts are today, so a student who leaves or crashes mid-task still leaves their tries behind.
- French for teachers comes later. When it does, these fields become string IDs with parameters, like the student strings. Note this in the contract's doc comment.

## Acceptance

- [ ] `@repo/game-contract`: `Attempt` gains optional `asked`, `detail` and `exploring`, with doc comments covering the rules above. `attemptProblem` refuses: either text over 200 characters or empty; `exploring` with `succeeded: true`, a misconception or `assisted`; and a task whose `asked` changes between its attempts within a play (checked in the shell and in the API, which already sees each play's records)
- [ ] The play shell passes all three fields through to its records. Its contract suite and stand-ins cover them
- [ ] API: `POST /play-records` accepts and validates them. A migration adds nullable `asked` and `detail` text columns and an `exploring` boolean (default false) to `PlayRecord`. Old records keep working with all three absent
- [ ] Scoring (`scoring.ts`) leaves out exploring attempts everywhere: understanding, the misconception strip, the evidence tallies (a task with only exploring tries isn't counted), and effort when ticket 13 lands. Integration tests show an exploring try changes no result
- [ ] `GET …/plays/{play}`: each task has `asked` (from its first attempt that has one, or null), and each attempt has `detail` and `exploring`. `GET …/expectations/{id}`: each play also counts its tries, `tries` and `explored`, next to the task tallies
- [ ] Teacher app:
  - [ ] Port types, the fake and the API adapter carry the new fields. The contract suite covers them
  - [ ] The play view heads each task with what it asked, then lists every try in order: "Explored" (muted, never styled as wrong), "Not yet" or "Got it", plus help, its detail and any misconception
  - [ ] A shared `<TeacherText>` renders `a/b` and mixed numbers as stacked fractions with a screen-reader label ("five fourths"), and everything else as plain text. Unit-test the parsing: `3/8`, `1 3/4`, `5/4`, a date-like `10/29` inside words (render it anyway: games are told to write only fractions as `a/b`), and text with no fractions
  - [ ] An attempt with neither field reads as it does today
- [ ] Docs: the glossary's **Attempt** says an attempt can carry what was asked and what the student did, and that an exploring try is an attempt that never counts. ADR 0002 gets a consequences line: games describe tasks and tries in text for teachers, and the platform never parses it except to draw fractions. Update `build-game` and `design-game` (SPEC-TEMPLATE's Attempts section: "What the teacher sees for each task and try") so new games fill these in
- [ ] Tests: integration tests (the fields stored and read back, validation 400s, exploring ignored by scoring, the play and evidence responses) and rendered-app tests (the play view with asked, explored, missed and solved tries, and fractions drawn). Check the play view at 1366 and 360 px in headless Chrome with long details
