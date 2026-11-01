---
name: review-game
description: Review a built game against the design principles, its game spec and the Chromebook budgets, and report each check with evidence. Use after build-game, after a change to a built game, or before a game ships.
---

# Review a game

You check one built game (`games/<slug>`) against the platform's principles and its **game spec**, and report each check as pass, fail or unmeasured, with evidence. Terms in bold are defined in `docs/GLOSSARY.md`. Run it in a fresh session where you can: a reviewer who built the game shares its blind spots.

You find and report; you fix only what the human approves. A finding is a defect the code shows, not a design you'd have chosen: the spec's pedagogy and fun calls are the founder's, already made.

## 1. Load

Read `docs/DESIGN.md` ("Guiding principles", "How games are built"), `games/<slug>/SPEC.md`, `packages/game-contract/src/index.ts`, and every file in `games/<slug>/src/`, `tour.ts` and `mutations.ts`.

Done when you've read every source file in the game.

## 2. Run the checks

Run, in the game's folder or the repo root as given (in the sandbox, in a scratch copy: see "Running anything in the sandbox" in `AGENTS.md`):

- `pnpm --filter @games/<slug> test`, `pnpm --filter @repo/curriculum test` and `pnpm check-types`
- `pnpm mutate <slug>`
- `pnpm tour <slug> --out <scratchpad>/tour`, then look at the screenshots
- `pnpm --filter play build`, then the game's chunk sizes in `apps/play/dist` (gzip each file the game loads)
- `pnpm check-voice`

Then go through every check below. Each gets a verdict and its evidence: a test name, a file and line, a command's output, a screenshot. A check nothing automated covers gets read in the code or seen in the tour; one you can't measure here is **unmeasured**, never pass.

### The mechanic is the lesson

- Every misconception in SPEC.md has a rules test that detects it, and a visible failure on screen when it's acted on (find it in the tour or the component).
- No question sits in front of the game: the student answers by playing, not by picking from a quiz.
- Exploring never counts as a mistake: a probe never reaches `onAttempt` as a failure or a misconception match.

### Evidence

- Every expectation in the manifest is in the product layer and matches its tier's grade, and every attempt evidences an expectation its task genuinely needs (no over-claiming).
- The manifest's tiers, misconceptions and strings come from the rules or the spec tests, and the spec tests pass: code and SPEC.md agree.
- `assisted` on every attempt is the help that was on before that try, at the rung the spec gives.
- Every try reaches `onAttempt` as it happens, each with a `detail`, and `asked` is the same on every try at a task.
- If what a tier evidences or what its attempts record changed since the last commit that touched it (`git log -p -- games/<slug>`), `Version` was bumped and the old manifest is in the API's `earlierManifests`.
- Every mutation is caught or marked `survives` with a reason that holds.

### Students

- No free text: no `input`, `textarea` or `contenteditable` a student types into.
- No score, coins, points, stars-as-count, combos, streaks or timers racing the student. Rewards follow effort, so nothing on screen rewards getting it right first time over fixing it.
- Every interaction works by tap; drag is never the only way. Pointer Events, nothing hover-only. Targets at least 64 px for Grades 1–2 and 48 px after (the tour checks buttons; check other targets by eye).
- Every instruction is a caption and a voice line from the same string ID. For Grades 1–3, nothing needs reading: demonstrations or visuals carry it. At every grade, every result shows on screen, so nothing needs hearing.
- Voice and screen take turns: actions follow an `await say(...)`, no timer is sized to a line's length, and one moment is one `say(...)`. The game opens with a line, since it mounts after the shell's start tap.
- The screen fits 1366 × 650 and 1280 × 650 with no scroll at every tier, and its screen is laid out in the kit's `GameFrame`.
- The avatar's expression follows play as the spec says.

### Contract and code

- The game never calls `fetch`, touches `window.location` or `history`, or stores anything in `localStorage` or cookies.
- Every user-facing text comes from `t(...)`: no literal text in JSX or `aria-label`s.
- Colours and sizes come from `@repo/tokens`; components from `@repo/ui`, never `@mantine/*`; art through named slots; motion off under `prefers-reduced-motion`.
- Voice lines are current (`check-voice`), or the founder knows `pnpm voice` is pending.

### Chromebook budgets

- At most 250 KB gzipped JavaScript beyond the shell, and at most 2 MB to start one tier, art and audio included (voice lines load when said, and music loads behind the game once it has started, so they don't count; sound effects do).
- At least 30 fps while dragging and touch response within 100 ms, under 4× CPU throttling: **unmeasured** until the kit automates it, unless you measure it in the tour with Chrome's CPU throttling.

Done when every check above has a verdict and evidence.

## 3. Report

Report a table, one row per check: verdict, evidence, and for each fail the smallest fix. List fails first. Ask the human which fixes to apply, apply those, and re-run the checks they touch.

Done when the human has decided on each fail, and every approved fix is applied and re-checked.

## 4. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. A check that kept finding the same defect belongs in `build-game` as a rule, so propose it there. Done when the retro says it is.
