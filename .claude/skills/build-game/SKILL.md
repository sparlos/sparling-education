---
name: build-game
description: Build a game from its approved game spec, on the starter kit, until the founder accepts it as playable. Use when a game spec is approved and its game doesn't exist yet, or when an approved spec change has to reach a built game.
---

# Build a game

You turn one approved **game spec** (`games/<slug>/SPEC.md`) into a game the founder has played and accepted. Terms in bold are defined in `docs/GLOSSARY.md`; use them exactly. Fraction Hop (`games/fraction-hop`) is the reference build: when unsure how something is done, read how it did it.

**The spec is the authority.** You build what it says. Where it's silent or wrong, you make a **reading** (a judgement call that changes nothing evidenced) and list it for the founder, or you stop and ask (anything that changes what's evidenced, a tier, a misconception or a string). Every answer goes back into SPEC.md, so code and spec never drift.

## 1. Load the ground rules

Check `SPEC.md` says `Status: approved`. If it doesn't, stop: send the human to `design-game`.

Read the spec in full, then `docs/DESIGN.md` ("Guiding principles" and "How games are built"), `packages/game-contract/src/index.ts`, `packages/game-kit/README.md`, `.claude/rules/ui.md`, and the template game in `packages/game-kit/template/src/`. Skim `.scratch/game-framework/build-log.md` for Step 8 (Fraction Hop): its gotchas will bite you too.

Check every spec decision works with the contract as it is. If one needs a contract change (Plank Bridge's spoken sequences needed `say(...ids)`), propose it to the human before building. An approved change goes in `packages/game-contract`, the shell, the fake shell in `@repo/game-kit/testing` and the contract's type test together.

Done when you can name, for each tier, the expectation every attempt evidences, and every contract change the spec needs is approved or there are none.

## 2. Scaffold

Run `pnpm new-game <slug>`. It copies the template beside the spec and registers the game in `apps/play`.

**`pnpm install` runs on the host, never in the sandbox** (see "Running anything in the sandbox" in `AGENTS.md`). Ask the human to run it, and verify in a scratch copy meanwhile.

Done when the template game's tests pass under the new slug.

## 3. The rules

Write the game's rules as plain TypeScript in `src/rules/`, with no React: generating a play per tier (seeded, from `@repo/game-kit/random`), judging each action, matching each misconception, the help ladder and the attempt each try emits. Rules tests run in Node (`// @vitest-environment node`).

- **Each misconception is a prediction:** what the student would do if they held the wrong idea. The generator keeps every prediction distinct from the right answer and from each other, and only makes tasks where each prediction is something the student can actually do with what's on screen. If an action still matches two misconceptions, record none: wrong evidence in front of a teacher is worse than none.
- **Separate exploring from mistakes.** A probe (trying something to see what happens) never counts as a miss: send it as an attempt with `exploring: true` (never succeeded, no misconception, no help).
- **Every try is an attempt, sent as it happens:** a probe as `exploring`, a mistake as `succeeded: false`, the solve as `succeeded: true`. `assisted` is the help that was on *before* the try, so the try that triggers help reads as on their own. A misconception goes on the try that brings it over its threshold, at most once per task.
- **Describe each task and try for teachers.** Every attempt carries `asked` (the same text on every try at the task) and `detail` (what the student did on this try), built in the rules from their state, never from the student strings: plain en-CA text, at most 200 characters, fractions as `a/b` and mixed numbers as `1 3/4`, nothing else written that way. Teachers read it; it's never spoken or voiced. Test the longest `detail` the game can write (the fullest plan the budget allows) against the limit: Fraction Hop writes three or more of the same hop as `12 × 1/10` to fit.
- **Write the simulator** (`src/rules/simulate.ts`, exported as `./simulate`): the game contract's `Simulate`, which plays a whole play as a simulated student (accuracy, the misconceptions they hold, how often they take help) through the same rules functions the screen calls, and returns the attempts the game would have sent. The platform's demo class is made of these plays, so they must look like real ones: probes as `exploring`, every miss, help taken when offered, `asked` and `detail` on each. A student's mistakes follow a misconception they hold where the task lets it show; otherwise they're slips that match none, so a student never shows one they don't hold. Test it: the same seed gives the same attempts, every attempt passes `attemptProblem`, and each misconception shows up for students who hold it at the tiers that reveal it, never for those who don't. Fraction Hop's `src/rules/simulate.ts` is the reference.
- **Test the generator's invariants over many plays per tier** (Fraction Hop uses 150): every task within its tier's expectations, every misconception revealable where the spec says it is, every amount the game can speak has a string.

Done when every misconception in the spec has a test that detects it, every tier has an invariant test, every kind of try at every tier has a test of the attempt it sends, and the simulator's tests pass.

## 4. Manifest, strings and spec tests

Build the manifest's tiers and misconceptions from the rules' own tables, so what the game records and what it declares can't drift. Strings are whole sentences, with fragments only for families such as amounts (`frac.3-4`), typed with template literals. Give `strings` an explicit type: spreading template-literal keys drops them.

Write `src/spec.test.ts` with `describeManifestSpec` from `@repo/game-kit/spec`, plus the game's own numbers, string families and Attempts table (rebuild each `asked`/`detail` row from the rules), so the tests read SPEC.md and fail when code and spec disagree.

Done when the spec tests pass and every string in SPEC.md's table is in `strings.ts`, word for word.

## 5. The screen

`src/game/` wires the rules to taps, the voice and the shell; it holds no rules. Plain state that isn't rules (a bench, a plan) gets its own module and tests.

- **Voice and screen take turns.** Say a line (a pointer may rest on what it's about), then act, then say the next: `await say(...)` before acting, and `useTimers().pause` only for beats between turns, never a timer guessed from a line's length. One moment is one `say(...)`: a new call cuts off the last, so a result and the next prompt go in one call.
- **The game starts after the shell's start tap,** so it opens with a spoken line and can rely on sound being allowed.
- **The game frame lays out every screen.** Build on `GameFrame` from `@repo/game-kit/frame`, and spread `frameStrings` from `@repo/game-kit/frame-strings` into the game's strings. It draws Hint or Skip, the main button, the caption and the ghost hand, and `NumberPad` is the only number pad. The game fills `info`, `stage`, and `side` or `deck`. Never draw these yourself, and if the frame can't do what the spec needs, change the frame for every game (ask the founder first). The kit's tests and the tour fail otherwise. `packages/game-kit/README.md` has the details.
- **Touch first:** every action works by tap (pick up, then place). Drag is a second way in, through Pointer Events. Targets are at least 64 px for Grades 1–2 and 48 px after, or the spec's own size.
- **Never read, never hear:** every instruction is a caption and a voice line from the same string, and every result shows on screen.
- **The screen always fits** 1366 × 650 and 1280 × 650 with no scrolling, with the shell's progress strip above it and its rail on the left.
- **The avatar's expression follows play** (thinking, happy, encouraging, cheering), as the spec says.
- **Look:** colours and sizes from `@repo/tokens`, components from `@repo/ui`, art through named slots (`@repo/game-kit/art`), and `prefers-reduced-motion` turning motion off.

Write `src/game.test.tsx` with `mountGame` from `@repo/game-kit/testing`: play every tier through, with a miss and a solve on every task type, and use `heldVoice()` to show actions wait for the voice. Tap with `fireEvent.click` inside `act`: `userEvent` hangs under fake timers. Run Vitest from the game's folder (`pnpm --filter @games/<slug> test`): from anywhere else every test fails with no jsdom.

Done when the fake-shell tests play every tier to the end, and the shell never reports a contract breach.

## 6. Break it, then tour it

Tests that pass first time prove little: in every build so far, breaking rules on purpose found untested ones.

1. List each key rule in `mutations.ts`: every misconception match, every generator invariant, every help threshold, the recorded `assisted`, and each `await say` that keeps voice and screen in turn. Run `pnpm mutate <slug>`. Each survivor gets a test, or `survives` with the reason it can't matter.
2. Write `tour.ts` and run `pnpm tour <slug>`. It plays every tier at both sizes in headless Chrome through the real shell, and checks fit and target sizes. Play a miss and a solve on every task type. It catches what jsdom can't (pieces covered by controls, taps landing on the wrong thing, plugin failures). If it says the dev server "doesn't host <slug>", a stale server holds port 3003: kill it or pass `--url`.
3. Look at the tour's screenshots yourself.

Done when every mutation is caught or marked `survives`, and the tour passes at every tier and both sizes.

## 7. Voice

`pnpm voice` runs only on the founder's Mac: ask them to run it, listen on the review page and commit. Until then `check-voice` fails and the game uses browser speech, which is fine for playing. After the first run, restart the dev server so it picks up the lockfile.

Done when the founder has been asked, with the number of new lines.

## 8. The founder plays

**Host it in the API first**, so the founder finds it where teachers and students will: on the dashboard (turned on in every class) and in students' homes. The game link alone reaches neither. Add `hosted(manifest, simulate)` to `games` in `apps/api/src/games.ts` and the game to `apps/api/package.json`'s dependencies (install in the scratch copy and copy back `pnpm-lock.yaml`). New teachers' demo classes then play it, with its own misconceptions. Then run the API's tests: the ones that list a class's games, its expectations or the demo's misconceptions grow by the new game, so update them to match.

Then give the founder the game link (`/play/<slug>`), what isn't built yet, and your numbered **readings** of the spec for them to confirm, and tell them to run `pnpm install` on the host and restart `pnpm dev`. They play, ideally on a touchscreen, and give their calls. For each call: change the code, update SPEC.md, re-run steps 5–6, and say what changed. Visual polish the founder raises (motion, feedback moments, layout finesse) goes on a list for `polish-game`, unless it blocks play.

**Bump `Version`** in SPEC.md and the manifest when what a tier evidences, or what its attempts record, changes. Records made under the old version still arrive days late, so add the old manifest, frozen, to `earlierManifests` in `apps/api/src/games.ts` (Fraction Hop's `src/manifest-v1.ts` is the shape).

Done when the game is on the dashboard and in students' homes, the founder accepts it as playable, every reading is confirmed or changed, and SPEC.md matches the game.

## 9. Record and review

Add the build's entry to `.scratch/game-framework/build-log.md`: what's where, decisions, readings, the founder's calls, gotchas, what's left open and the polish list. Then run `review-game` on the game in a fresh session, and fix what it finds.

Done when the build-log entry is written and `review-game` reports no failing check.

## 10. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. Done when it says it is.
