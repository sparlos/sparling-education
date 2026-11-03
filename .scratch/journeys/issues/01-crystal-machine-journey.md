# Crystal Machine gets its journey

Status: ready-for-human

Run `design-game` ("Giving a built game its journey"), then `build-game`.

The founder's idea: each job builds a fragment of a larger gem shown in the UI. The play opens on the gem's empty outline, each job's shard flies into it, and job 6 completes the gem.

To work out in the prototype:

- Where the gem sits on a screen that's already full of chutes, tubes and the pad, at Grades 3–5 (Grade 5 has the most tubes), at 1366 × 650 and 1280 × 650.
- Whether a shard's flight needs the moment between jobs to last the full 4 seconds.

New voice lines (the goal and the ending) need the founder to run `pnpm voice`.

Crystal Machine goes first because its screen changes less than Fraction Hop's.

## Comments

2026-11-02: Founder picked `lab/gem-pull-back` ("Gem: grows between jobs"). The Journey section is in `games/crystal-machine/SPEC.md`, as a draft awaiting approval, then `build-game`. The moment between jobs takes about 2.6 s, under the 4 s limit. Also for the build: each chute's crystal picture paints behind the chute's panel (`.chute > :not(svg)` doesn't lift it), so the chutes show only their count.

2026-11-03: Built: `src/game/GiantCrystal.tsx`, wired through `CrystalMachine.tsx`. Tests, mutations and the tour pass. Waiting on the founder: `pnpm voice` (2 lines), then playing and accepting it. The chute picture is fixed. After acceptance: the retro (`docs/agents/skill-retro.md`) for design-game and build-game, and unblock 02.
