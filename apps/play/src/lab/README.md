# Prototype lab

Dev only. Rough, throwaway prototypes of candidate mechanics, played by the founder before any game spec is written, so only concepts found fun get designed and built. The `design-game` skill builds them (its step 3).

```sh
pnpm --filter play dev     # http://localhost:3003/play/lab
pnpm --filter play test    # includes the grounding test
```

`/play/lab` lists every prototype with what it targets, and has the grade picker. Archived prototypes are under the Archive tab. `/play/lab/<slug>` plays one for that grade. Like `shell-check`, the lab is behind `import.meta.env.DEV` and isn't in production builds.

## Adding a prototype

Create `<slug>/index.tsx` here. The folder is all it takes to list it. It exports:

- `meta` (`PrototypeMeta` in `prototype.ts`): a title, a one-line pitch, the reference-layer expectation IDs it targets (read in full from `packages/curriculum/reference/`), the misconceptions it should make visibly fail and how, the sample task it draws on, and why it might be fun.
- a default component taking `PrototypeProps`: the grade, the student's `Avatar` portrait and `speak(text)`, which says plain text with browser speech. The lab's "hear it again" replays the last thing said. Pass `speak` one line per moment: each call cuts off the one before.

Keep it rough: hours, not days. No tests, no strings table, no art beyond shapes, no attempts, no game contract. But keep to the principles the founder will judge it by: no points, coins or score; the same representation at every grade unless `meta` says why (Hop Code's Grade 5 ticks differed by accident); and the whole prototype fits a 1366 × 650 screen with no scrolling. `clothesline/` is the model for how rough, and what `meta` looks like. It isn't a candidate game.

`grounding.test.ts` fails if a prototype targets an expectation that isn't in the reference layer, names no misconception, or cites a sample task from an expectation it doesn't target.

Once the founder has picked one, archive the others: set `isArchived: true` in their `meta`. The lab lists them under its Archive tab, still playable, so the founder can revisit them. Archive the winner too once its real game exists.
