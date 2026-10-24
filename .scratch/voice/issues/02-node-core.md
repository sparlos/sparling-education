# 02: `packages/voice` Node core

Status: resolved

Spec: `../spec.md` (Package shape, Quality control, Voice registry)

## What

The TypeScript half of `packages/voice`, built and tested against a fixture manifest and a fake synth worker, so it needs no model and doesn't wait on issue 01.

- Find voice sources: `games/*` manifests and the play shell's strings. Read `strings["en-CA"]`.
- Load a voice from `voices/<name>/` (model ID, Kokoro voice, language code, default speed, pronunciation map). Ship the real `narrator`: `mlx-community/Kokoro-82M-8bit`, `af_heart`, `lang_code` `"a"`, speed 1.0.
- Read per-line overrides (`games/<slug>/voice/overrides.json`, keyed by string ID: optional `speed`, optional model-only `text`).
- Hash each line from the text sent to the model (after pronunciation substitutions and overrides), the voice's settings and the line's speed.
- Diff against `voice/voice.lock.json`: synthesise new and changed lines through the worker interface (JSON on stdin: voice settings plus `[{ text, speed, outPath }]`), delete orphaned files, and write the lockfile.
- Write a local review page of changed lines (never committed; gitignored or in a temp directory).
- Expose the stale check as a function and a script (used by issue 05).
- A root `pnpm voice` script.

## Done when

- Vitest covers: first run, a changed string, an unchanged rerun producing no work, an orphan deleted, a pronunciation-map change and a per-line override each touching only the affected lines, substitutions and overrides never reaching captions, and stale-check verdicts.
- Biome and type checks pass.

## Comments

Built `packages/voice` (`@repo/voice`), Node half only. Tests use `node:test` like the other packages (not Vitest): `pnpm --filter @repo/voice test` (18 pass), `check-types`, Biome clean.

- `pnpm voice` (root) runs `scripts/voice.ts`; `pnpm --filter @repo/voice check-voice` runs `scripts/check.ts` (exit 1 with "voice lines stale, run `pnpm voice`"). Issue 05 imports `checkStale` or runs the script.
- Sources: `games/*/src/manifest.ts` exporting `manifest`, `strings["en-CA"]`. Zero games is fine. The play shell has no string table (`apps/play/src/play/strings.ts` is only a translator), so it isn't a source yet; open.
- Hash (`src/hash.ts`) is a pure-JS SHA-256 with no Node APIs, so issue 04 can import it at Vite build time (`@repo/voice/hash`). `lineHash(settings, text, speed)` = first 16 hex of sha256 of `{model, voice, langCode, text, speed}`.
- Override text replaces the caption as the model text, then pronunciations apply to it. Substitution is one pass, longest key first.
- Lockfile `games/<slug>/voice/voice.lock.json`: `{version:1, voice, lines:{"en-CA":{id:hash}}}`, sorted by ID. Audio at `voice/en-CA/<id>.mp3`. Review page at `packages/voice/.review/index.html` (gitignored via root `.gitignore`), written only when lines were generated.
- A failed or silent worker leaves lines stale (old file removed before the call, lock entry unchanged), and `generate` throws.
- Worker: `uv run synth` in `packages/voice`, one JSON request on stdin, stdio inherited, injectable via `SynthWorker`.
