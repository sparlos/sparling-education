---
name: polish-game
description: Give a Kindling game that already plays well its visual polish pass (layout, motion, feedback moments), with the founder looking at each change. Use after the founder has accepted a game as playable, in a fresh session.
---

# Polish a game

You make a game the founder has accepted as playable (`build-game` step 8) look and feel finished: layout, motion and feedback moments. Run it in a fresh session, so the build's context doesn't crowd out the look.

**Polish changes how a game feels, never what it teaches or records.** A change to a tier, a misconception, an attempt, the help ladder or a rule is a spec change: put it back to the founder for SPEC.md and `build-game`, not here.

## 1. Load

Read `games/<slug>/SPEC.md`, the game's "Not built" and polish items in `.scratch/game-framework/build-log.md`, any notes in `.scratch/playtest-notes/<slug>.md`, `.claude/rules/ui.md`, and the game's `src/game/`. Run `pnpm tour <slug> --out <scratchpad>/before` and look at every screenshot.

Done when you have one list of polish items, from the log, the notes and what you saw in the screenshots, with anything that's really a spec change set aside for the founder.

## 2. Agree the list

Show the founder the list, with the spec changes set apart, and let them rank and trim it. Ask one question at a time.

Done when the founder has picked the items for this pass.

## 3. Polish, one item at a time

For each item:

- Keep the rules: motion and feedback follow the same turns as the voice (`await say(...)`, then act), honour `prefers-reduced-motion`, take colours, sizes and motion durations from `@repo/tokens`, and change art only through its slots.
- A feedback moment rewards effort, never speed or a first-time right answer: a cheer for a fix is fine, a combo isn't.
- Keep it cheap on a Chromebook: animate `transform` and `opacity`, and keep the game's chunk within its 250 KB budget.
- Run the game's tests and tour after each item, and give the founder the before and after screenshots, or the link to play when it's motion.

Done when every picked item is built, the tests and tour pass, and the founder has seen each one.

## 4. Record and review

Update the game's build-log entry with what was polished and what was left. Run `review-game` if the polish touched interactions or layout.

Done when the log is updated and any review's fails are fixed.

## 5. Retro

Run the retro in `docs/agents/skill-retro.md` on this run. Done when it says it is.
