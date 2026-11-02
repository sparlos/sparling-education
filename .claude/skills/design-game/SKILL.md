---
name: design-game
description: Design a game and write its game spec, before any game code. Use when starting a new game, giving a built game its journey, or changing what an existing game teaches or evidences.
---

# Design a game

You produce one approved **game spec**: the design a game is built from. Terms in bold are defined in `docs/GLOSSARY.md`; use them exactly.

**Fun is found by playing, never on paper.** Plank Bridge, the first game, was approved on paper, built to playable, then rejected by the founder as "not fun, bad concept". So no spec is written until the founder has played prototypes and picked one (step 3).

**Every game has a journey.** Cargo Line's first build was a train going around a loop, with no sense of going anywhere; six trips making one climb to a summit got "that's soooo much better". A journey has three parts, all visible in the game's own world: the student sees what they're heading for from the start, each finished task visibly brings them closer, and the last one ends in a big moment. It either goes somewhere (Cargo Line's mountain) or builds something (a gem, shard by shard).

**Giving a built game its journey:** the mechanic stays, so skip steps 2 and 3.1–3.2. Prototype two or three journeys over the existing mechanic (`lab/cargo-climb` is the model), and grill only the Journey bullet below. Add the spec's Journey section, return it to `Status: approved` with the founder, and hand it to `build-game`. It needs no version bump.

## 1. Load the ground rules

Read `docs/DESIGN.md` (the ranked principles settle every disagreement), `docs/GLOSSARY.md`, `packages/game-contract/src/index.ts` (what a game can and cannot do) and `packages/curriculum/README.md`.

Done when you can state the game's concept and grade range. If the human hasn't given them, ask.

## 2. Load the curriculum

Open `packages/curriculum/reference/<edition>/index.md`, find the strand files for the grade range, and read them in full: the expectations, then their key concepts, examples and sample tasks. The sample tasks are the richest source of mechanics and **misconceptions**.

The reference layer is the only source for codes and wording. When you show expectations to the human, quote their official wording verbatim; only the product must never contain it. If the subject or edition you need isn't there, stop and run `add-curriculum` with the human, naming the curriculum and grades.

Then check what existing games already evidence: search `games/*/SPEC.md` for each candidate expectation ID and read the Mechanic and Tiers sections of every game that uses one. Overlap is fine when the mechanic differs; raise it with the human while grilling, especially the same expectation with the same kind of task.

Done when you have, for each grade in range, the expectation IDs the concept covers, each read in full, and the games that already evidence any of them.

## 3. Find the fun: prototypes

1. **Ask what's fun.** Open with your own recommendation of one or two genres that fit the concept, and why, then name 5–7 well-known games in that genre, each with what hooks players, and ask which the human or kids enjoy, or what else they'd add. Ask one question at a time.
2. **Propose two or three different mechanics** for the concept. Each one must be grounded:
   - it targets expectation codes you read in full in step 2, and only those each task genuinely evidences: an attempt names one expectation (so a miss lands only on the expectation the task tests, and the teacher's grid stays readable), so check every grade's tasks need nothing beyond its tier's expectations (Hop Code over-claimed two, and its Grade 4 budget silently needed equivalence),
   - it should make at least one real misconception visibly fail,
   - it borrows what's fun from the games named in item 1,
   - it draws on a curriculum sample task where one fits,
   - its first screen shows what to do: if starting needs more than one spoken sentence of setup, simplify it (Lift Bridge was "too much to explain and understand before they can start"),
   - it plays as a whole journey, in plain shapes: a grey triangle for a mountain, a dot that moves up after each task, a flag that turns green at the end. Allow about an hour of the prototype for it.

   Make the mechanics genuinely different from each other, not three skins on one idea. Don't reuse a rejected concept: Plank Bridge (cutting planks to exact fractional lengths to fill gaps in a bridge) was rejected, and its code and spec deleted.
3. **Build each one in the prototype lab** (read `apps/play/src/lab/README.md` first, and copy the shape of `lab/clothesline/`): `apps/play/src/lab/<slug>/index.tsx`, played at `/play/lab/<slug>` in dev. Each exports `meta` (title, a pitch that names the journey, expectation codes, misconceptions, sample task, why it might be fun) and a rough component. Keep it to hours: no tests, no strings table, no art beyond shapes, no attempts. `pnpm --filter play test` must pass: the lab's grounding test checks every code against the reference layer.
4. **Check it in a browser yourself first.** Play each prototype in headless Chrome (Playwright's `chrome-headless-shell` is in `~/.cache/ms-playwright/`, and `playwright-core` installs into a scratch folder), so the human never plays something broken. Check it fits a 1366 × 650 viewport with no scrolling, at every grade. Then look for a way to solve a task without the concept (Ten Machine's first cut let a student type the whole number into the ones chute): close it in the prototype, or raise it with the human. Try each grade's hardest task without paper too: if it needs written working, say so when you hand it over, and what the game offers for it (the founder hit Cargo Line's Grade 5 regrouping unwarned).
5. **The human plays them on a real touchscreen if possible**, then says what they liked and disliked. Iterate, combine or throw away prototypes until they pick one, or stop if none is fun.

Done when the human has played the prototypes and picked one, and you've recorded why it's fun (and what they rejected and why) for the spec's "Why it's fun" section.

## 4. Grill the design

Invoke the `mattpocock-skills:grilling` skill and work through these with the human, one question at a time (this overrides the grilling skill's rounds). Write each question as AGENTS.md's User-facing content asks: plain words, with codes and IDs last. Give every question, and every option in it, a concrete example from the game: a real task with real numbers, what the student does, and what they see. The founder understands a choice from its example, not from its description. Bring your pedagogy knowledge and the sample tasks; the human makes each call.

- **Start from the chosen prototype.** Everything below refines the mechanic the human picked. If grilling changes the core mechanic, prototype again rather than approving a design nobody has played.
- **The mechanic is the lesson.** What does the student physically do (tap, drag, cut, sort, place) such that getting better at it *is* getting better at the concept? When a wrong idea is applied, what visibly fails, so the student sees *why*? Reject any design where the concept sits in a question in front of the game.
- **Journey.** Which kind, and each part of the template's Journey section, within its limits. Time is short in class and a student sees the moments between tasks five times a play, so they stay short enough to need no skip. Every part shows on screen and is spoken where it has a line, so a student who can't hear or read still follows it. The ending is the same for every student: a cloudy gem for a student who needed help would be a score.
- **Tiers.** One per grade. Which expectations each tier evidences, and how the tasks change between tiers.
- **Misconceptions.** Each one the mechanic can surface, named by the wrong idea (e.g. `bigger-denominator-bigger`), with how it shows up in play and which expectations it belongs to. Put each one to the human as the teacher will read it: the dashboard sentence (the manifest's `description`, written to AGENTS.md's User-facing content, with a short `e.g.`), then one plain line on what the student sees in the game. Its example shows only the wrong working, never the right answer. Say which curriculum note it comes from (a key concept or sample task), in plain words, so it's clearly maths, not reading. Never lead with play mechanics or game jargon: the founder found a table of "how it shows up in play" hard to follow.
- **Attempts.** What one task is, when an attempt is recorded, what counts as success, and how a retry of the same task is recognised. If the student can try things freely (run and watch), separate exploring from mistakes: a probe goes as an `exploring` attempt, which never counts. Every try is an attempt, so a teacher can follow a task try by try. Say what the teacher reads for each task (`asked`) and each kind of try (`detail`): one short line each, from the rules' state, with fractions written `a/b` (mixed `1 3/4`), one row per form in the template's table.
- **Effort.** How the game invites a retry after a mistake: the hint, the replay, the second chance. The contract's `assisted` values (`hint`, `demonstration`, `guided`) are options, not a required ladder: use only the rungs that make sense for this mechanic.
- **Avatar.** Portrait only, or also a character in the game, and what it does. Expressions come from the contract's set (`@repo/avatar`); one it lacks is a change for every game.
- **Touch and reading.** Every interaction works by touch at the target sizes in DESIGN.md's Chromebook budgets. Every instruction is a caption and a voice line from the same string. For Grades 1–3, a student never has to read to play, and at any grade never has to hear: demonstrations and visual feedback must carry the meaning without either.
- **Renderer.** React + SVG/DOM unless the mechanic needs something it can't do; justify any exception.
- **Teacher card.** When to use the game alongside instruction, and how each misconception reads in results.

Done when every section of the spec template below can be filled without guessing.

## 5. Write the spec

Write `games/<slug>/SPEC.md` from [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md), with `Status: draft`. Then archive the prototypes the human didn't pick: set `isArchived: true` in their `meta`, so they stay playable under the lab's Archive tab. Never delete a prototype unless the human asks. Archive the winner once its real game exists. Never archive `clothesline/`, the model prototype.

Add each expectation the spec uses to the product layer, `packages/curriculum/src/<edition>.ts`, with a description in our own words, written from what the expectation means rather than by editing the official sentence, and its `link` to the expectation's page on dcp.edu.gov.on.ca: from `reference/<edition>.json` when the import recorded links, otherwise from the human, who opens the page and pastes its address. Run `pnpm --filter @repo/curriculum test`.

Done when the tests pass and the spec is consistent:
- "Why it's fun" says what the human played and picked, and why,
- the Journey section fills all three parts, within the template's limits, and its voice lines are in Strings,
- every tier expectation is evidenced by at least one attempt,
- every misconception names a visible failure in the mechanic and expectations of a tier,
- every student-facing string is listed, with its ID,
- every string decision works with the game contract as it is (Plank Bridge's "amount as its own string" needed a contract change nobody had checked),
- every amount the game speaks or shows, differences after a miss and what any plan the game accepts can produce included, fits its string families and its display.

## 6. Get approval

Walk the human through the spec, revise until they approve it, then set `Status: approved`. Ask them to check each expectation ID against the DCP. A game is built only from an approved spec, with `build-game`.

## 7. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. Done when it says it is.
