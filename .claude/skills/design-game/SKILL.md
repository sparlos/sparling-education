---
name: design-game
description: Design a Kindling game and write its game spec, before any game code. Use when starting a new game, or changing what an existing game teaches or evidences.
---

# Design a game

You produce one approved **game spec**: the design a game is built from. Terms in bold are defined in `docs/GLOSSARY.md`; use them exactly.

**Fun is found by playing, never on paper.** Plank Bridge, the first game, was approved on paper, built to playable, then rejected by the founder as "not fun, bad concept". So no spec is written until the founder has played prototypes and picked one (step 3).

## 1. Load the ground rules

Read `docs/DESIGN.md` (the ranked principles settle every disagreement), `docs/GLOSSARY.md`, `packages/game-contract/src/index.ts` (what a game can and cannot do) and `packages/curriculum/README.md`.

Done when you can state the game's concept and grade range. If the human hasn't given them, ask.

## 2. Load the curriculum

Open `packages/curriculum/reference/<edition>/index.md`, find the strand files for the grade range, and read them in full: the expectations, then their key concepts, examples and sample tasks. The sample tasks are the richest source of mechanics and **misconceptions**.

The reference layer is the only source for codes and wording. If the subject or edition you need isn't there, stop and run `add-curriculum` with the human, naming the curriculum and grades.

Then check what existing games already evidence: search `games/*/SPEC.md` for each candidate expectation ID and read the Mechanic and Tiers sections of every game that uses one. Overlap is fine when the mechanic differs; raise it with the human while grilling, especially the same expectation with the same kind of task.

Done when you have, for each grade in range, the expectation IDs the concept covers, each read in full, and the games that already evidence any of them.

## 3. Find the fun: prototypes

1. **Ask what's fun.** Ask the human for one or two games, of any kind, that they or kids genuinely enjoy, and what hooks them. Ask one question at a time.
2. **Propose two or three different mechanics** for the concept. Each one must be grounded:
   - it targets expectation codes you read in full in step 2, and only those each task genuinely evidences: an attempt names one expectation, so check every grade's tasks need nothing beyond its tier's expectations (Hop Code over-claimed two, and its Grade 4 budget silently needed equivalence),
   - it should make at least one real misconception visibly fail,
   - it borrows what's fun from the games named in item 1,
   - it draws on a curriculum sample task where one fits.

   Make the mechanics genuinely different from each other, not three skins on one idea. Don't reuse a rejected concept: Plank Bridge (cutting planks to exact fractional lengths to fill gaps in a bridge) was rejected, and its code and spec deleted.
3. **Build each one in the prototype lab** (read `apps/play/src/lab/README.md` first, and copy the shape of `lab/clothesline/`): `apps/play/src/lab/<slug>/index.tsx`, played at `/play/lab/<slug>` in dev. Each exports `meta` (title, pitch, expectation codes, misconceptions, sample task, why it might be fun) and a rough component. Keep it to hours: no tests, no strings table, no art beyond shapes, no attempts. `pnpm --filter play test` must pass: the lab's grounding test checks every code against the reference layer.
4. **Check it in a browser yourself first.** Play each prototype in headless Chrome (Playwright's `chrome-headless-shell` is in `~/.cache/ms-playwright/`, and `playwright-core` installs into a scratch folder), so the human never plays something broken. Check it fits a 1366 × 650 viewport with no scrolling, at every grade.
5. **The human plays them on a real touchscreen if possible**, then says what they liked and disliked. Iterate, combine or throw away prototypes until they pick one, or stop if none is fun.

Done when the human has played the prototypes and picked one, and you've recorded why it's fun (and what they rejected and why) for the spec's "Why it's fun" section.

## 4. Grill the design

Invoke the `mattpocock-skills:grilling` skill and work through these with the human. Bring your pedagogy knowledge and the sample tasks; the human makes each call.

- **Start from the chosen prototype.** Everything below refines the mechanic the human picked. If grilling changes the core mechanic, prototype again rather than approving a design nobody has played.
- **The mechanic is the lesson.** What does the student physically do (tap, drag, cut, sort, place) such that getting better at it *is* getting better at the concept? When a wrong idea is applied, what visibly fails, so the student sees *why*? Reject any design where the concept sits in a question in front of the game.
- **Tiers.** One per grade. Which expectations each tier evidences, and how the tasks change between tiers.
- **Misconceptions.** Each one the mechanic can surface, named by the wrong idea (e.g. `bigger-denominator-bigger`), with how it shows up in play and which expectations it belongs to.
- **Attempts.** What one task is, when an attempt is recorded, what counts as success, and how a retry of the same task is recognised. If the student can try things freely (run and watch), separate exploring from mistakes: a probe goes as an `exploring` attempt, which never counts. Every try is an attempt, so a teacher can follow a task try by try. Say what the teacher reads for each task (`asked`) and each kind of try (`detail`): one short line each, from the rules' state, with fractions written `a/b` (mixed `1 3/4`), one row per form in the template's table.
- **Effort.** How the game invites a retry after a mistake: the hint, the replay, the second chance. The contract's `assisted` values (`hint`, `demonstration`, `guided`) are options, not a required ladder: use only the rungs that make sense for this mechanic.
- **Avatar.** Portrait only, or also a character in the game, and what it does.
- **Touch and reading.** Every interaction works by touch at the target sizes in DESIGN.md's Chromebook budgets. Every instruction is a caption and a voice line from the same string. For Grades 1–3, a student never has to read to play, and at any grade never has to hear: demonstrations and visual feedback must carry the meaning without either.
- **Renderer.** React + SVG/DOM unless the mechanic needs something it can't do; justify any exception.
- **Teacher card.** When to use the game alongside instruction, and how each misconception reads in results.

Done when every section of the spec template below can be filled without guessing.

## 5. Write the spec

Write `games/<slug>/SPEC.md` from [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md), with `Status: draft`. Then archive the prototypes the human didn't pick: set `isArchived: true` in their `meta`, so they stay playable under the lab's Archive tab. Never delete a prototype unless the human asks. Archive the winner once its real game exists. Never archive `clothesline/`, the model prototype.

Add each expectation the spec uses to the product layer, `packages/curriculum/src/<edition>.ts`, with a description in Kindling's own words, written from what the expectation means rather than by editing the official sentence. Run `pnpm --filter @repo/curriculum test`.

Done when the tests pass and the spec is consistent:
- "Why it's fun" says what the human played and picked, and why,
- every tier expectation is evidenced by at least one attempt,
- every misconception names a visible failure in the mechanic and expectations of a tier,
- every student-facing string is listed, with its ID,
- every string decision works with the game contract as it is (Plank Bridge's "amount as its own string" needed a contract change nobody had checked),
- every amount the game speaks, differences after a miss included, falls within its string families.

## 6. Get approval

Walk the human through the spec, revise until they approve it, then set `Status: approved`. Ask them to check each expectation ID against the DCP. A game is built only from an approved spec, with `build-game`.

## 7. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. Done when it says it is.
