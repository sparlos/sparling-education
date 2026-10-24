# 05: CI stale check

Status: resolved

Blocked by: 02

Spec: `../spec.md` (CI)

## What

- Wire the stale check from issue 02 into the repo's checks (a turbo task or the test run; check the installed Turborepo docs before changing `turbo.json`, per `AGENTS.md`).
- It needs only Node: no Python, model or ffmpeg.
- It fails if any string's hash doesn't match its lockfile entry, or if a file is missing or orphaned, printing the affected game and IDs and "voice lines stale, run `pnpm voice`".

## Done when

- Changing a string without re-running `pnpm voice` fails the check, and re-running makes it pass.

## Comments

- Wired as turbo task `check-voice` (`turbo.json`), run by root `pnpm test` (`turbo run test check-voice`) and by root `pnpm check-voice`. Cached, with inputs `$TURBO_DEFAULT$`, `$TURBO_ROOT$/games/*/src/**`, `$TURBO_ROOT$/games/*/voice/**`, `voices/**`, so staleness can't hide behind a cache hit (verified in a scratch turbo repo: editing each misses, no change hits). `scripts/check.ts` gained `--root`; a node test covers the CLI (passes with no games, stderr lists `game: id (kind)` then the stale message, exit 1). Fixture run: pass, edit fails, revert passes. No CI workflow file exists in the repo; README has a CI section.
