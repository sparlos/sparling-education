# Play shell

Hosts every Kindling game at its game link, `/play/<slug>`, on the same domain as the class world. It owns everything a game doesn't (see `packages/game-contract`): sign-in, choosing the tier, loading, voice lines and "hear it again", getting attempts to the platform despite flaky wifi, and the trip back to the portal.

**It runs on stand-ins for the backend today.** See [`src/platform/README.md`](./src/platform/README.md) for what's simulated and what replaces it.

## Running it

```sh
pnpm --filter play dev     # http://localhost:3003/play/shell-check
pnpm --filter play test
```

`/play/lab` is the dev-only prototype lab, for playing candidate mechanics before a game spec is written; see [`src/lab/README.md`](./src/lab/README.md).

`/play/shell-check` is a dev-only game that exercises the whole contract. The first visit goes to the stand-in sign-in, where you pick a grade. Add `?portal=north` to finish into the stand-in hub, a placeholder until the locker. Add `?stand-in-offline` to watch attempts wait on the device and retry.

## Layout

- `src/platform/`: the ports to the rest of Kindling, their contract tests, and the stand-ins.
- `src/play/`: the shell's rules as plain TypeScript (tier choice, the outbox, a play's attempts and exit, voice, game links).
- `src/ui/`: the React screens, built from `@repo/ui`.
- `src/lab/`: the prototype lab (dev only).
- `src/games.ts`: the registry. A game is added here by slug once its package exists.
- `src/main.tsx`: the composition root, and the only file that picks the platform.
