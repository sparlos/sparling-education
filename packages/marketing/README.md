# @repo/marketing

Kindling's marketing videos, built in Remotion from a **brief**: one file per
video (`videos/<id>/brief.ts`) saying who it's for, every voice-over line,
the scene that shows each line, the voice and the music. The `make-video`
skill (`.claude/skills/make-video`) walks an agent through writing one.

## Pipeline

```sh
pnpm --filter @repo/marketing voice <id>    # Mac only: Kokoro lines + word timings
pnpm --filter @repo/marketing make <id>     # music, mix, render (and voice, on a Mac)
pnpm --filter @repo/marketing make <id> --only render --stills 30,300
pnpm --filter @repo/marketing studio        # preview every brief live
```

| Step | Does | Writes (`public/<id>/`, gitignored) |
| --- | --- | --- |
| `voice` | Speaks each beat's `say ?? vo` in an `@repo/voice` voice (the games' Kokoro narrator by default, with its pronunciation map), deterministic, trimmed, -16 LUFS, 48 kHz WAV; Whisper word timestamps, mapped onto the caption's exact words (`src/align.ts`), with a per-line match count. Only new or changed lines are spoken. | `voice/<beat>.wav`, `voice.json` |
| `music` | Renders the brief's Strudel pattern offline in headless Chrome, cut to the video's bars. | `music.wav` |
| `mix` | Places each line, ducks the bed under the voice (a gain envelope from the timeline, not a compressor), adds a whoosh per transition, -14 LUFS, peaks at -1 dB. | `mix.wav` |
| `render` | Remotion, H.264 + AAC. | `out/<id>.mp4` |

`src/timeline.ts` lays out the video from the voice takes, and both the mixer
and the composition read it, so picture and sound can't drift. Transition
midpoints snap to the music's beat and the video ends on a bar. Before any
voice exists, timings are estimated, so the Studio and `--stills` work on a
new brief straight away.

## Voices

Videos speak in the games' own voices, from `@repo/voice`
(`packages/voice/voices/<name>/voice.json`): the brief's `voice.name`, default
`narrator`. A respelling added there (`pronunciations`) fixes the word in the
games and the videos alike. The brief can set its own `speed`; the narrator's
0.9 suits students, a teaser for adults reads better at 1.

## A brief

- `vo` is both what's said and the caption, exactly. Use `say` to change only
  what the model hears (pacing, a fraction spelled out).
- Scenes are the `Scene` union in `src/brief.ts`, one component each in
  `src/scenes/`. Scenes land moments on spoken words (`useBeat().cue("play")`
  presses play as "play" is said), so the header of each scene says which
  words it listens for.
- A new scene kind: add its props to `Scene` and its component to
  `src/scenes/index.tsx`. Brand rules are `.claude/rules/ui.md`: colours and
  sizes from `@repo/tokens`, the press edge only on clickable things, all copy
  through props.
- Mix levels default in `scripts/mix.ts` (`defaultLevels`); override per brief
  with `mix`.

## Setup and gotchas

- The voice step runs in `@repo/voice`'s uv environment (mlx-audio and the
  espeak shim) and needs Apple Silicon. `MARKETING_PYTHON` points it at
  another Python; `MARKETING_WORDS_MODEL` swaps the Whisper build.
- ffmpeg must be installed (`brew install ffmpeg`).
- Chrome: `$CHROME`, else Playwright's chrome-headless-shell (under
  `~/.cache` or `~/Library/Caches`), else Google Chrome (`scripts/chrome.ts`).
- Light leaks need WebGL. Headless Chrome on macOS gets it only through
  ANGLE, so `scripts/chrome.ts` sets `gl: "angle"` there ("Failed to acquire
  WebGL context" without it).
- Strudel's samples come from `github:tidalcycles/dirt-samples`
  (raw.githubusercontent.com). Synths need nothing.
- Strudel's offline render steals voices past its polyphony cap, which shows
  as the bed's level sagging; `scripts/music.ts` sets a high cap.
- Remotion's esbuild loader can't read tsconfig under TypeScript 7, so
  `webpack-override.ts` sets the automatic JSX runtime for the Studio and
  `bundle()`. Without it: "React is not defined".
- Strudel is AGPL; it's a dev-time tool here and only its audio output ships.
