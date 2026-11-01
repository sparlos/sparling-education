# A worked example for every misconception

Status: needs-triage

Raised 2026-11-01 while designing Cargo Line. Some wrong ideas don't fit in one sentence. The founder couldn't follow "Does what the trip did instead of undoing it when the starting amount is missing" until shown an example. Teachers won't do better at a glance.

## Settled with the founder

- **The example lives in the existing panel.** On the dashboard, each misconception in "Misconceptions showing up" already opens to show who showed it. The example goes there too, so there's no new modal or button (see the fewer-controls principle for teacher screens).
- **A worked example the game writes, one per misconception**, and the same for every class. Never a real student's try, because there may not be one (a new class, or a misconception nobody has shown yet), and messy tries explain badly.
- **The one-line `description` becomes a short name for the idea**, and the example does the explaining.
- **The example shows only the wrong way**: the question and the wrong working. No right answer beside it (founder: "just show me the WRONG way").

Example, from Cargo Line:

> **Undoes the trip the wrong way round.**
> The train dropped off 136 and came back with 251. How many did it leave with?
> 251 − 136 = 115

## Work this needs

- **Game contract:** add an `example` to `Misconception` in `packages/game-contract/src/index.ts`: the question (if any) and the wrong working, in plain teacher text with the same fraction rules as `asked` and `detail`. Decide whether it's required for every game.
- **Existing games:** write examples for Fraction Hop's and Crystal Machine's misconceptions, and shorten their descriptions to match.
- **Teacher app:** show the example in the open misconception panel on the dashboard. Decide whether it also shows on a student's page and in quick assess.
- **design-game:** the spec template's Misconceptions and Teacher card sections gain the example.
- Teachers only: never shown to students, and not voiced.
