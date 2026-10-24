# Game framework: contract, play shell, skills and the first two games

Status: ready-for-agent

## Problem Statement

Kindling's heart is its **games**, but none exist yet, and the plan is for agents to build most of them. Without a shared framework, every agent-built game would invent its own way of choosing a **tier**, recording evidence, scoring effort, handling touch, showing the **avatar**, localising text and reaching the API. The **results** teachers rely on for report cards would then be inconsistent across games, and games would drift from the principles in the design doc (the mechanic is the lesson, rewards follow effort, runs on the worst Chromebook). Agents also can't be trusted to recall Ontario curriculum expectation codes from memory, so evidence could be mapped to expectations that don't exist.

## Solution

A small, enforced framework that every game is built against, plus skills that guide an agent from curriculum to finished game:

- **A game contract.** A game is a self-contained package that declares a manifest (tiers, the expectations each evidences, the **misconceptions** it can reveal, its strings) and a component. It only receives props and emits **attempts**. The type checker rejects anything outside the manifest.
- **A play shell.** One app on the same domain as the **class world** hosts every game at its **game link**. It owns sign-in, tier choice, loading, voice playback, sending attempts to the API, and the round trip back to the **hub**. Kindling computes understanding and effort from attempts the same way for every game.
- **Curriculum as data.** The official expectations are checked in for agents and humans to design against. The product shows only Kindling's own descriptions.
- **A prototype lab.** Before any game spec is approved, the founder plays rough throwaway prototypes of a few candidate mechanics in a dev-only area of the play app, and picks the one that's fun. Each prototype is still grounded in real curriculum expectations.
- **Skills.**
  - `design-game` finds the fun with prototypes, then produces an approved **game spec**.
  - `build-game`, `review-game` and `add-curriculum` are extracted from building the first fractions game, then tested by building the second MVP game with them.

Already done: the game contract, the curriculum package with Math (2020) Grades 1–8 imported, the `design-game` skill, the play shell, the avatar package with the 2D portrait, the prototype lab, Fraction Hop, the starter kit (`packages/game-kit`), and the `build-game`, `polish-game`, `review-game` and `add-curriculum` skills.

**Course correction (2026-10-24).** The first fractions game, Plank Bridge, was designed on paper, approved, and built until it was playable. The founder then played it and rejected the concept: "not fun, bad concept". Its tests proved it taught, but nothing ever checked it was fun. So fun is now tested first, with throwaway prototypes, before a game spec is written. See build-order steps 5–7 and "Prototype lab" below.

## User Stories

1. As a student, I want to open a game from a portal in the hub, so that playing feels like part of my class world.
2. As a student, I want to open a game from a game link my teacher posted, so that I can play without loading the class world.
3. As a signed-out student opening a game link, I want to sign in and land straight back in the game, so that I don't have to find it again.
4. As a student, I want the game to give me the tier for my grade automatically, so that the content fits what my class is learning.
5. As a student, I want to see my own avatar in every game, so that the games feel like mine.
6. As a student, I want my avatar's portrait to react to what I do (thinking, happy, encouraging, cheering), so that it feels like it's playing with me.
7. As a student in a game that uses my avatar as a character, I want my avatar to act in the game, so that I'm part of the story.
8. As a student, I want to play entirely by tapping and dragging, so that I can play on a touchscreen Chromebook without a mouse.
9. As a Grade 1–3 student, I want every instruction spoken aloud and shown by demonstration, so that I can play without reading.
10. As a student with an IEP that calls for read-aloud, I want to hear any instruction again, so that reading isn't a barrier.
11. As a student, I want to see why my wrong idea didn't work when it fails in the game, so that I learn from the mistake rather than just being told I'm wrong.
12. As a student, I want to retry a task after a mistake, so that I can improve.
13. As a student who struggles but keeps trying, I want to earn as many rewards as a student who gets it right first time, so that effort is what counts.
14. As a student, I want never to see a score, so that the game doesn't feel like a test.
15. As a student, I want to return to the hub in front of the portal I came through when I finish, so that I can carry on where I was.
16. As a student, I want to see the rewards I earned when I get back to the hub, so that I know my effort paid off.
17. As a student, I want the hub and games to look and feel like one product, so that moving between them isn't jarring.
18. As a student on a slow school Chromebook, I want games to load quickly and stay smooth while I drag things, so that the game is playable.
19. As a student on flaky classroom wifi, I want my play to count even if the connection drops, so that my work isn't lost.
20. As a student in a French Immersion class, I eventually want games in French, so that they match the language I learn in.
21. As a teacher, I want each game to come with a teacher card, so that I know what it teaches, for which grades, and when to use it alongside my instruction.
22. As a teacher, I want results mapped to Ontario curriculum expectation codes, so that I can use them as report-card evidence.
23. As a teacher, I want to see which misconceptions my students showed, in plain language, so that I know what to reteach.
24. As a teacher, I want evidence earned in September to still be reported accurately in June, even if the game changed in between, so that my assessment stays honest.
25. As a teacher, I want results from a game link to count exactly like results from a portal, so that how students open a game doesn't matter.
26. As a teacher, I want descriptions of expectations that are clear and consistent across games, so that quick assess is easy to read.
27. As a prospective teacher in the demo class, I want games to behave exactly as in a real class, so that the demo is representative.
28. As the founder, I want an agent to design a new game with me from the official curriculum text, so that the game targets real expectations.
29. As the founder, I want the agent to stop and ask me to import a curriculum it doesn't have, so that it never invents expectation codes.
30. As the founder, I want to approve a game's pedagogy once, in the game spec, before anything is built, so that I don't review design decisions in code.
30a. As the founder, I want to play rough prototypes of two or three candidate mechanics before any game spec is written, so that only concepts I've found fun get designed and built.
30b. As the founder, I want every prototype to name the curriculum expectations and misconceptions it targets, so that finding the fun never drifts away from what the game must teach.
31. As the founder, I want an agent to build a game from an approved spec against the contract and a starter kit, so that new games are cheap to make.
32. As the founder, I want an agent to review a built game against Kindling's principles, so that games stay true to the design without me checking each one by hand.
33. As the founder, I want tests to prove each game catches every misconception its spec names, so that "the mechanic is the lesson" is checked, not assumed.
34. As the founder, I want each game's Chromebook budgets checked automatically, so that slow-device performance never regresses unnoticed.
35. As the founder, I want agent-drawn placeholder art to be swappable for illustrated assets without code changes, so that games can ship before art is commissioned.
36. As the founder, I want voice lines generated from each game's strings, so that changing text never leaves the audio stale.
37. As the founder, I want the official curriculum text kept out of anything the product shows, so that Kindling doesn't reproduce Crown-copyright text without a licence.
38. As the founder, I want the type checker to reject games that reference unknown expectations, misconceptions or strings, so that mistakes are caught before review.
39. As the founder, I want to import another subject's curriculum with one reviewed script run, so that adding Language or Science later is routine.
40. As an agent building a game, I want one typed contract and one default stack, so that I don't make framework decisions per game.
41. As an agent building a game, I want to load only the curriculum strand files I need, so that my context stays small.
42. As an agent building a game, I want to test the game without a backend, so that I can verify my work on my own.

## Implementation Decisions

### Build order

1. Done: the game contract, the curriculum package (Math 2020, Grades 1–8), and the `design-game` skill.
2. Done: `design-game` for the fractions game, producing the game spec for Plank Bridge (Grades 3–5), later rejected (step 5).
3. Done: the play shell (`apps/play`), on stand-ins for the backend. See `build-log.md` for its decisions and what was left open.
4. Done: the 2D avatar portrait and the 3D avatar, both drawn from one look in `@repo/avatar` (placeholder parts). See `build-log.md`.
5. Done, then rejected: Plank Bridge built to playable (`games/plank-bridge`, see `build-log.md`). The founder rejected the concept after playing it. Its code and spec were then deleted at the founder's request; the lessons are in `build-log.md`.
6. Done: the prototype lab (`apps/play/src/lab`, see "Prototype lab" and `build-log.md`).
7. Done: `design-game` re-run for the fractions game. The founder played Hop Code and Spring Run, and picked Hop Code, now **Fraction Hop** (`games/fraction-hop/SPEC.md`). See `build-log.md`.
8. **Done:** Fraction Hop, played and accepted by the founder (polish deferred to its own skill) (`games/fraction-hop`, see `build-log.md`). Built against the contract, with an agent working alongside the founder. Reuse the patterns that carry over from Plank Bridge (below). Generate its voice lines with `pnpm voice` from `packages/voice` (spec: `.scratch/voice/`), and prefer whole-sentence strings over fragments.
9. **Done:** `packages/game-kit` (see its README and `build-log.md`). Extract the starter kit (template, fake-shell harness, budget checks, art slots, browser tour) from what worked in step 8. Voice-line generation isn't built here: it's `packages/voice` (`.scratch/voice/`), and the starter kit only wires a game's line map into it.
10. **Done:** `build-game`, `review-game`, `add-curriculum` and `polish-game` (`.claude/skills/`, see `build-log.md`). Write the `build-game`, `review-game` and `add-curriculum` skills from that experience. Rules they must carry (founder's calls from playing Fraction Hop): **the voice and on-screen actions take turns, never both at once.** A line is said (a pointer may rest on what it's about), then the action happens, then the next line: `await say(...)` before acting, never fixed timings guessed from a line's length. And **every game starts after the shell's start tap**, so its first line can play. Visual polish (layout, motion, feedback moments) **is its own skill** (founder's call after step 8), run as a second pass in a fresh session once a game plays well. Fraction Hop's deferred polish ("Nice fix!" and the sparkle, highlighting each plan block as its hop runs, dragging blocks) is its first job.
11. Build the second MVP game (same math strand, a different mechanic) using the skills, prototype step included, as their first real test. Fix the skills wherever the agent needed hand-holding.

What carries over from Plank Bridge, whatever the new mechanic (as patterns: its code is deleted):
- the contract's `say(...ids)`, which speaks several strings as one instruction,
- rules as plain TypeScript, with misconception predictions that the generator keeps distinct from the right answer and from each other,
- tests that read the game spec and fail when the code drifts from it,
- breaking each key rule on purpose to find untested rules,
- a scripted headless-Chrome tour through every task type, which caught bugs that jsdom couldn't,
- the friction recorded in `build-log.md`.

### Prototype lab

- **Where:** a dev-only area of the play app. `/play/lab` lists the prototypes, and `/play/lab/<slug>` plays one. Like `shell-check`, it's behind `import.meta.env.DEV` and never in a production build. Prototypes live in `apps/play/src/lab/<slug>/`.
- **What a prototype is:** a rough, playable React component that answers one question: is this mechanic fun, and does playing it exercise the concept? It's built in hours, not days. It has no tests, no strings table, no art beyond rough shapes, and no scoring or attempts. Once the founder decides, the prototypes not picked are archived (`isArchived` in `meta`) rather than deleted: they stay playable under the lab's Archive tab.
- **What the lab gives it:** the grade the founder picks on the lab page, the student's avatar portrait, and `speak(text)` (browser speech with plain text, so there's no string table). No sign-in, and no game contract, so a prototype costs nothing to start.
- **Grounding, which isn't optional:** every prototype exports `meta`:
  - a title and a one-line pitch,
  - the reference-layer expectation codes it targets (e.g. `math-2020.g4.B1.5`), read in full from `packages/curriculum/reference/`,
  - the misconceptions it should make visibly fail, and how,
  - the curriculum sample task or example it draws on, if any,
  - why it might be fun, including the game or genre it borrows from.

  A lab test checks every code against `packages/curriculum/reference/math-2020.json`, so a prototype can't target an expectation that doesn't exist. Prototypes use reference codes rather than the product layer, because product-layer descriptions are only written once a spec is approved.
- **The founder's verdict is recorded:** after playing, `design-game` writes what the founder liked and disliked about each prototype into the game spec's new "Why it's fun" section, before the spec is drafted.

### Game contract (exists)

- A game is a workspace package that exports a manifest and a React component through one definition helper.
- The manifest declares:
  - its slug, which is its game link path,
  - a version,
  - its renderer: DOM by default, PixiJS or PlayCanvas only with a justification in the spec,
  - avatar use: portrait, or character too,
  - tiers, each with a grade and the expectation IDs it evidences,
  - misconceptions, each with the expectations it belongs to,
  - strings by ID, with English required and other locales as translations.
- The shell passes the tier, the locale, the student's avatar portrait already dressed in their look, a string lookup, a voice-line player, an attempt callback and a finish callback.
- An attempt has a task ID (so retries of a task are recognised), an expectation from one of the manifest's tiers, a success flag, an optional misconception from the manifest, and an optional marker of the help given before it (hint, demonstration or guided).
- A game never holds credentials, calls the API or navigates.
- Gaps to add during steps 5–6:
  - an avatar character API (poses or animation), when the first game uses it,
  - the art-slot component,
  - Pointer Events helpers.

### Play shell

- A separate Vite + React single-page app, served on the same domain as the class world and the marketing site through path routing. The rewrites themselves are deferred until deployment.
- Shares sign-in with the class world, so there's one session.
- Responsibilities:
  - redirecting to sign-in and back,
  - choosing the tier from the grade the teacher set,
  - loading,
  - playing voice lines, with build-time audio first and browser speech as the fallback,
  - showing a "hear it again" control,
  - batching and retrying attempts,
  - the round trip back to the portal the student came from, with the reward reveal,
  - for a student who isn't in a class, a simple game-complete screen instead.
- Attempts go to one pluggable destination: the real API, or the demo class's simulated backend.
- Before sending, the shell adds the student, game slug, game version, tier and timestamp to each attempt.
- **Platform seam.** Sign-in, the student's grade and class, the endpoint for play records and the demo class's backend don't exist yet. Everything the shell needs from them goes through typed ports in `apps/play/src/platform/`, which is the contract the backend implements. Until then the shell runs on **stand-ins**, kept in `platform/stand-ins/` and named as stand-ins in code, logs and the README. A shared contract test suite runs against the stand-ins now and against the real adapters when they land. The real backend is expected to be a typed Hono API like `apps/hubworld-api`, with a generated client the adapters wrap. Its spec follows once the fractions game is playable and the scoring questions are answered.
- Component and integration tests use Vitest, React Testing Library and jsdom.

### Results and scoring

- Kindling computes understanding and effort from attempts, the same way for every game. Effort rewards improvement after a retry, not raw retries.
- The exact rules are an open question in the design doc and outside this spec. This spec only guarantees that attempts carry what those rules need.
- The shell also records how each play ended: finished, left by the student, or crashed. A play with no ending was abandoned. A crash never counts against a student's effort.
- Each expectation is recorded with its curriculum edition. A change to what a tier evidences bumps the game version, and old results keep the version they were earned under.

### Curriculum (exists)

- **Reference layer:** the official text, elaborations included, imported from the DCP content API by a script a human runs. It's read only by agents and humans, and the package's exports exclude it.
- **Product layer:** expectation IDs in the form edition, grade, code (e.g. `math-2020.g4.B1.5`), each with Kindling's own description, added as games need them. It also holds the six Learning Skills by name.
- A human checks each expectation ID against the DCP before it's merged.
- `add-curriculum` wraps the import script: one request per run, never in CI, with the diff reviewed by a human.

### Avatar

- An avatar's look is defined once, as data (`@repo/avatar`): a body colour plus an item ID per part slot. The class world renders it in 3D; games render it in 2D.
- Every game shows the portrait, with expressions: neutral, happy, thinking, encouraging, cheering. A character in the scene is opt-in per game.
- Each new cosmetic item ships with both its 3D and 2D art. Both renderers key their art by item ID, so the type checker enforces it.
- The current 3D avatar is a placeholder capsule, so the avatar's look itself is still to be designed. An illustrator designs the 2D style kit and the avatar parts.

### Art and audio

- Agents draw SVG within the 2D style kit. Games refer to art by named slot, and a real asset registered under the same slot ID, with the same bounds and anchor point, replaces the placeholder without code changes.
- Voice lines are generated by text-to-speech at build time, one per string ID per locale, and regenerated when the string changes. How is specified in `.scratch/voice/spec.md`: a local model on the founder's Mac, one narrator voice, committed MP3s per game, and a lockfile so stale lines fall back to browser speech and fail CI.

### Skills

- `design-game` (exists, with its prototype step): loads the ground rules and the relevant strand files, asks the founder which games they find fun, builds two or three grounded prototypes in the lab for the founder to play and pick from, then grills the founder, writes the game spec from a template, adds product-layer descriptions, and gets approval.
- `build-game`: implements an approved spec using the starter kit. It doesn't start without an approved spec.
- `review-game`: checks a built game against the principles:
  - the mechanic is the lesson,
  - no free text and no visible score,
  - touch-first at the target sizes,
  - no reading required for Grades 1–3,
  - Chromebook budgets met,
  - every manifest expectation valid,
  - every misconception tested.
- `add-curriculum`: the import flow for a new subject or edition.
- `polish-game`: the visual pass (layout, motion, feedback moments) on a game the founder has accepted as playable, in a fresh session. It never changes what the game teaches or records.
- **Every skill ends with a retro** (`docs/agents/skill-retro.md`). The agent lists every back-and-forth with the human during the run, sorts out which ones the skill could have prevented, and proposes edits to the skill for the human to approve. So the skills improve with each game.
- **A build log** (`.scratch/game-framework/build-log.md`) is kept from step 3 onward: the decisions made, friction, and what would have been avoidable. It is the raw material for step 7.

### Budgets (in the design doc)

- Reference device: a 4 GB Celeron N4020 or MediaTek MT8183 Chromebook, approximated with 4× CPU throttling and Fast 3G.
- Per game: at most 250 KB of gzipped JavaScript beyond the shell, at most 2 MB to start one tier, at least 30 fps while dragging (60 fps target), touch response within 100 ms.
- Touch targets at least 48 px, and 64 px for Grades 1–2.
- These are starting numbers. Recalibrate them after the fractions game, against a real board Chromebook if one is available.

## Testing Decisions

- Tests check external behaviour only: what a student can do and what attempts come out, not component internals or state shape.
- **Seam 1, the game contract (main seam).** Each game is mounted in a fake shell that supplies the contract props, played through simulated touch, and checked for:
  - the attempts it emits: valid expectations for the tier, misconceptions from the manifest, retries recognisable by task ID,
  - finishing,
  - the Chromebook budgets, under throttling.
- Under that seam, each game's rules are plain TypeScript, with unit tests showing that every misconception in the spec is detected and every tier only generates tasks within its expectations.
- **Seam 2, where the shell sends attempts.** Shell tests swap in a fake destination to cover batching, retrying after a dropped connection, the tier choice, the sign-in redirect back to the game link, and the round trip back to the hub.
- The avatar's 2D renderer is tested through the contract's avatar prop, with no separate seam.
- Type-level tests confirm the contract rejects unknown expectations, tiers, misconceptions and strings.
- Prior art:
  - the curriculum package's Node test-runner tests (reference integrity, and the copied-wording detector),
  - the token package's contrast tests,
  - the contract's type checks, which so far were run as a throwaway example and should become a checked-in type test.

## Out of Scope

- The scoring rules for understanding and effort, the weekly reward cap, and the recognition traits (open questions in the design doc).
- The teacher view, quick assess, and how results are stored and presented.
- Path rewrites and deployment, until the shell is ready to deploy.
- French translations and French audio. Games are ready for translation, but nothing is translated.
- Adaptive tiers.
- Recorded voice acting.
- Commissioning the illustrator, though the style kit's slot system is in scope.
- A commercial licence for the curriculum text. The product layer deliberately doesn't need one.

## Further Notes

- **`pnpm install` must be run on the host.** In the sandbox it tries to rebuild a `node_modules` shared with macOS, which would swap native binaries. To verify work in the sandbox, install in a scratch copy of the repo instead (see `build-log.md`).
- The DCP content API is undocumented and has no published terms. The import requests from this session were three to four. Keep imports rare and human-run.
- The fractions game's grade range stays Grades 3–5. Its concept is decided by playing prototypes in its `design-game` session, not here. The design doc's sketch (cutting planks to finish a bridge) became Plank Bridge and was rejected, so don't reuse it unless the founder asks.
- Relevant records: the two-layer curriculum package (ADR 0001), and games emitting attempts while Kindling scores them (ADR 0002). The design doc's "How games are built" section summarises every decision above.
