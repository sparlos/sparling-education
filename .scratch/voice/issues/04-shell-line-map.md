# 04: Line map, runtime guard and the shell's one swap point

Status: resolved

Blocked by: 02

Spec: `../spec.md` (Where audio lives and how the shell finds it)

## What

- A line-map helper that a game (or the shell, for its own strings) uses to expose `voice/en-CA/*.mp3` as fingerprinted URLs through Vite, code-split with the game.
- **Runtime guard:** include an ID only when its lockfile hash matches the hash of the current text, worked out at build time. Stale or missing IDs are left out, so `voice.ts` falls back to browser speech.
- One resolver in the shell that turns (game, locale, id) into a URL and feeds `lineUrl` in `createVoice` (`apps/play/src/play/voice.ts`). Note in code that this is where a CDN base goes later.
- Hash logic is shared with issue 02, not duplicated.

## Done when

- Tests show matching lines resolve, stale and missing lines don't, and `say` falls back to browser speech for them.
- A game's audio appears in its own chunk in a production build, not the shell's.

## Comments

Built the line map as a Vite plugin: `@repo/voice/vite` (`voiceLines({ root })`) serves `virtual:voice-lines/<slug>` as `{ id: url }` of current lines only (`currentLineFiles` in `src/linemap.ts`, which reuses `diffSource`, so it agrees with the CI stale check). Files are imported with `?no-inline`, so they are fingerprinted files even when small.
- Shell: `resolveLineUrl(game, locale, id)` in `apps/play/src/play/voice-lines.ts` (the CDN swap point) feeds `lineUrl` in `PlayScreen`. `HostedGame` gained an optional `lines`; `hosted(load, lines?)` takes the map loader. Game contract unchanged.
- Opt in: `hosted(() => import(game), () => import("virtual:voice-lines/<slug>"))` in `games.ts`.
- Tests: `packages/voice/src/linemap.test.ts` (including a real Vite production build: mp3s fingerprinted, map in the game's chunk and not the entry's), `apps/play/src/play/voice-lines.test.ts`.
- Open: the shell's own strings still have no source; the map is computed at build/dev start.
