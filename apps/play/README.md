# Play shell

Hosts every game at its game link, `/play/<slug>`, and the student's home at `/play/`, on the same domain as the teacher app and the API. It owns everything a game doesn't (see `packages/game-contract`): sign-in, joining a class (`/play/join/<code>`) and picking a grade, home, choosing the tier, loading, voice lines and "hear it again", and getting attempts to the platform despite flaky wifi.

It runs on the platform's API, or on stand-ins for development without it. See [`src/platform/README.md`](./src/platform/README.md).

## Running it

```sh
pnpm dev                   # everything, on the API: http://localhost:3004/play/ (through the teacher app's server) or :3003/play/
pnpm --filter play test    # needs Docker: the contract suites run the real adapters over a test Postgres
```

On the API, signing in needs Google: copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` (the same client as `apps/api`'s `GOOGLE_CLIENT_ID`). Students sign in with Google's redirect mode, so the OAuth client also needs `<origin>/api/sign-in/student` under **Authorised redirect URIs** for each origin (`http://localhost:3004`, `http://localhost:3003`, and production), as well as the origins under **Authorised JavaScript origins**.

To run without the API or Google, set `VITE_PLAY_PLATFORM=stand-in` in `.env.local` (`pnpm tour` starts its own server this way).

`/play/lab` is the dev-only prototype lab, for playing candidate mechanics before a game spec is written; see [`src/lab/README.md`](./src/lab/README.md).

`/play/shell-check` is a dev-only game that exercises the whole contract. On the stand-ins, the first visit goes to the stand-in sign-in, where you pick a grade; `/play/join/G45` joins a split class. `/play/shell-check?join=G34` opens it the way a teacher's game link does, joining that class first. Finishing or leaving returns home. Add `?stand-in-offline` to watch attempts wait on the device and retry.

## Layout

- `src/platform/`: the ports to the rest of the platform, their contract tests, and the stand-ins.
- `src/play/`: the shell's rules as plain TypeScript (tier choice, the outbox, a play's attempts and exit, voice, game links).
- `src/ui/`: the React screens, built from `@repo/ui`: `App.tsx` routes by URL and runs a game; `Home.tsx` is home, joining and sign-in.
- `src/lab/`: the prototype lab (dev only).
- `src/games.ts`: the registry. A game is added here by slug once its package exists.
- `src/main.tsx`: the composition root, and the only file that picks the platform (`VITE_PLAY_PLATFORM`).
