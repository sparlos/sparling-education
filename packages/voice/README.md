# @repo/voice

Build-time narrator lines. `pnpm voice` makes one MP3 per game string with
Kokoro (`af_heart`) running locally through MLX. Apple Silicon only, never run
in CI. Design: `.scratch/voice/spec.md`.

Node (`src/`, `scripts/`) does the logic: finding strings, hashing, diffing
against `games/<slug>/voice/voice.lock.json`, the review page. Python
(`synth/`) is a thin worker that turns `{ voice, lines }` on stdin into MP3s:
trim silence, normalise to -16 LUFS, mono ~48 kbps.

## One-time setup

1. Install [uv](https://docs.astral.sh/uv/) and ffmpeg: `brew install uv ffmpeg`.
2. `cd packages/voice && uv sync`. This builds `.venv` (gitignored) on Python
   3.12 with mlx-audio, misaki and the spaCy model.
3. The first `pnpm voice` downloads the model (about 0.3 GB) into the normal
   Hugging Face cache, `~/.cache/huggingface`. Nothing is stored in the repo.

## Use

```sh
pnpm voice                    # generate new and changed lines
pnpm check-voice              # stale check, no model needed (what CI runs)
```

- Only new or changed lines are generated. Re-running never touches a line you
  already approved, and orphaned files are deleted.
- Each run that generates something writes a review page,
  `packages/voice/.review/index.html` (never committed), with a player and
  text for each new line. Listen, then commit the MP3s and lockfile.
- `pnpm voice --root <dir>` (and `check-voice -- --root <dir>` inside this
  package) runs against another tree (for testing).

## CI

`check-voice` is a turbo task, run by the root `pnpm test` (`turbo run test
check-voice`), so any CI that runs `pnpm test` fails on stale lines. It needs
only Node: no Python, model or ffmpeg. On failure it prints
`<game>: <string id> (<new|changed|missing-file|orphan-file|orphan-lock>)` per
problem, ends with "voice lines stale, run `pnpm voice`" and exits 1. With no
games it passes. Fix: run `pnpm voice` on the Mac and commit the lines and
lockfile.

The task is cached, so `turbo.json` lists its inputs: the package's own files,
`games/*/src/**`, `games/*/voice/**` and `voices/**` (pronunciations). Change a
string, a line or the lockfile and it re-runs. If the check ever reads a new
kind of file, add it there. The repo has no CI workflow file yet.

## Using the lines in the shell

`@repo/voice/vite` is a Vite plugin (already in `apps/play/vite.config.ts`).
`virtual:voice-lines/<slug>` is a game's line map, `{ [id]: url }`, with only
the current lines: lockfile hash equals the hash of today's text, and the file
exists. Stale, missing and orphaned lines are absent, so the shell speaks them
with the browser. Files are fingerprinted assets, and the map lands in the
game's own lazy chunk. To opt a game in, register it with its map in
`apps/play/src/games.ts`:

```ts
"my-game": hosted(
  () => import("@games/my-game"),
  () => import("virtual:voice-lines/my-game"),
),
```

Games only call `say(id)`. The shell's `resolveLineUrl(game, locale, id)`
(`apps/play/src/play/voice-lines.ts`) is the one place a URL is decided, and
where a CDN base would go. The map is read when the build or dev server starts
(dev reloads on lockfile changes; after a game's first `pnpm voice`, restart
the dev server, since there was no lockfile to watch). Set up the same way, any dir with a
`src/manifest.ts` works as a source.

Two more maps come from the same plugin:

- `virtual:voice-lines/shell`: the play shell's own lines, from
  `apps/play/src/ui/shell-strings.ts`, recorded into `apps/play/voice/`.
- `virtual:voice-titles`: every game's `title` string (its name, required by
  the game contract), `{ [slug]: url }`, so home says a game's name
  without loading the game. The API's game names come from the same string,
  so renaming a game is one edit in its strings, then `pnpm voice`.

## Fixing a line that sounds wrong

Captions never change; these only affect what the model is told, and only
regenerate the lines they touch.

- **Pronunciation map**, for every game: `voices/narrator/voice.json`,
  `pronunciations`. Respell (`"½": "one half"`) or give Kokoro phonemes
  (`"Pip": "[Pip](/pɪp/)"`).
- **`games/<slug>/voice/overrides.json`**, for one line, keyed by string ID:
  `{ "amount.3-4": { "speed": 0.9 }, "retry": { "text": "Let's, try again." } }`.
  `text` is for the model only (a comma can fix pacing). `speed` is a tempo
  applied with ffmpeg's time-stretch after synthesis: Kokoro always speaks at
  its natural speed, because its own slow-down adds an "a-" before lines that
  start with an unvoiced sound.

Then run `pnpm voice` and listen again.

## Notes

- Kokoro's vocoder uses random noise. The worker seeds it per line, so a line's
  audio depends only on its text and settings, and a deleted file regenerates
  byte-identical.
- espeak-ng breaks on long library and data paths, so the worker makes a short
  per-user folder at `/tmp/kv-espeak-<uid>` and points
  `espeakng_loader` at it (`synth/espeak.py`).
- Changing trim, loudness or bitrate means bumping `AUDIO_FORMAT` in
  `src/hash.ts`, which marks every line stale.
