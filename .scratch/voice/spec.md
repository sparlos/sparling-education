# Voice: build-time narrator lines from a local TTS model

Status: ready-for-agent

## Problem Statement

Every instruction in a Kindling game is spoken aloud. Grades 1–3 play without reading, and students with a read-aloud IEP can hear any line again. Today the play shell has only browser speech, which sounds robotic and differs between devices. The game-framework spec already decides that voice lines are made by text-to-speech at build time, one per string ID per locale, and regenerated when the string changes. Nothing does that yet.

## Solution

A workspace package, `packages/voice`, generates a narrator voice line for every game string on the founder's Mac, using a local model through MLX (Apple Silicon). The audio is committed and bundled with each game. A lockfile records what each file was generated from, so stale audio is never played and CI catches it.

- **Build time only.** Students never hit a model. MLX only runs on Apple Silicon, so generation is a local command (`pnpm voice`), never part of turbo's `generate` task or CI.
- **English only for the MVP.** The layout is per locale, so French later is a data change.
- **One narrator voice:** an adult woman who sounds like a primary teacher, warm, clear, patient and unhurried. No child voices (founder's call).
- **The model was chosen by a bake-off by ear** (issue 01): **Kokoro** (`mlx-community/Kokoro-82M-8bit`), voice `af_heart`. It's small (0.3 GB), fast (well under a second per line on the M1 Pro), and with a fixed seed it's deterministic: the same text always gives the same audio.

## User Stories

1. As a Grade 1–3 student, I want instructions spoken in a natural, warm voice, so that I can follow them without reading.
2. As a student with a read-aloud IEP, I want "hear it again" to replay the same recording, so that it's consistent every time.
3. As a student, I never want to hear audio that doesn't match the caption, so that I'm not confused.
4. As a student on a slow Chromebook, I want voice lines to load with the game and stay within its budget, so that the game still starts quickly.
5. As the founder, I want to choose the narrator by listening to candidates side by side, so that the voice isn't one I find annoying.
6. As the founder, I want changing a string to regenerate only that line, and re-running to never change a line I've already approved, so that I only listen to what's new.
7. As the founder, I want to fix a mispronunciation or odd pacing without touching captions, so that duds are cheap to fix.
8. As the founder, I want CI to fail when audio is stale, so that `main` never ships mismatched lines.
9. As the founder, I want to move audio to a CDN later by changing one function, so that today's layout doesn't lock me in.
10. As an agent building a game, I want `pnpm voice` to just work from the manifest's strings, so that voice lines need no per-game code.

## Implementation Decisions

### Unit of generation

- One audio file per string ID. The shell's `say(...ids)` plays fragments one after another ("This gap needs" + "three fourths" + "of a plank."), and the small seams between fragments are accepted (founder's call).
- Authors should prefer whole-sentence strings and keep fragments for cases where combinations would explode, such as amount families. `build-game` and `review-game` should say so when they're written.
- Not doing: one file per combination, or cutting fragments out of carrier sentences. Either can come later as opt-in if a specific instruction sounds bad.

### Package shape (`packages/voice`)

- **Node (TS) owns all the logic**, run with `node scripts/*.ts` like the repo's other generators, and tested with Vitest:
  - finding games (`games/*`) and the play shell's own strings, and loading each manifest's `strings["en-CA"]`,
  - hashing each line from the text sent to the model (after pronunciation substitutions and any per-line override), the voice's settings and the line's speed,
  - diffing against `voice.lock.json`: generating new and changed lines, and deleting orphaned files whose string ID is gone,
  - writing the lockfile,
  - the stale check for CI,
  - writing the review page.
- **Python is a thin synthesis worker**: a uv project (`pyproject.toml`, `uv.lock`) inside the same folder. `uv run synth` reads JSON on stdin (voice settings plus a list of `{ text, speed, outPath }`), loads the model once, writes the files and exits. It knows nothing about games, hashes or lockfiles.
- `pnpm voice` (root script) runs the Node side, which shells out to the worker.
- The model and its Hugging Face cache stay out of the repo. Document the one-time setup (uv, ffmpeg, model download) in the package README.

### Voice registry

- `packages/voice/voices/<name>/` holds a voice: its model ID, Kokoro voice name, language code, default speed, and a pronunciation map.
- The MVP has one voice, `narrator`: `mlx-community/Kokoro-82M-8bit`, voice `af_heart`, `lang_code` `"a"`, speed 0.9 (slowed for young children, founder's call). Speed is a tempo applied with ffmpeg's time-stretch (`atempo`, pitch kept) after Kokoro speaks at its natural speed: Kokoro's own speed below 1 added an "a-" before lines starting with an unvoiced sound ("three fourths", "Too short."). It's a built-in Kokoro voice, so there's no reference clip and no real person's voice.
- Per-character voices later are a data change: add a voice folder, and let a manifest name it. Not in the MVP.

### Quality control

- **Stable by design:** the worker seeds MLX's random generator before each line (Kokoro's vocoder uses noise), so the same text and settings always give byte-identical audio, and re-running never changes an approved line. There are no seeds and no rerolls (founder prefers stable).
- **Pronunciation map** (in the voice): substitutions applied only to the text sent to the model, never to captions: respellings (`"½" → "one half"`) or Kokoro's inline phonemes (`"Pip" → "[Pip](/pɪp/)"`).
- **Per-line overrides**, for a line that sounds wrong: a speed (e.g. 0.9 for "three fourths"), or text for the model only (e.g. an added comma to fix stress or pacing) while the caption stays the same. Overrides live next to the game's voice files (e.g. `games/<slug>/voice/overrides.json`, keyed by string ID).
- Substitutions and overrides are part of each line's hash, so changing one regenerates only the lines it affects.
- **Review page:** each run writes a local HTML page, never committed, listing only the lines that changed, with players and their text.
- Not doing: automatic speech-to-text checks of each line. Maybe later.

### Audio format

- The worker trims leading and trailing silence, applies the line's tempo, normalises loudness to −16 LUFS, and encodes mono MP3 at about 48 kbps with ffmpeg. That's about 10–20 KB per line, and plays on every Chromebook.

### Where audio lives and how the shell finds it

- Per game: `games/<slug>/voice/en-CA/<string-id>.mp3` and `games/<slug>/voice/voice.lock.json`. The play shell's own strings follow the same layout in `apps/play`.
- Audio is bundled with the game's code through a line-map helper (Vite `import.meta.glob` with `?url`, or a small generated map), so it's fingerprinted, code-split with the game, and counted in its 2 MB budget per tier.
- **Runtime guard:** the line map includes an ID only when its lockfile hash matches the hash of the current text, worked out at build time. A stale or missing line is left out, so `voice.ts` falls back to browser speech. A stale line can sound robotic but is never wrong.
- **One swap point:** the shell resolves each line's URL in one place, which feeds `lineUrl(id)` in `createVoice` (`apps/play/src/play/voice.ts`). Games only ever call `say(id)`. Moving to a CDN later means changing that resolver to a CDN base plus the same path.
- Lab prototypes keep browser speech: they use `speak(text)` with no string IDs.

### CI

- A Node stale check (no model needed) fails if any string's hash doesn't match its lockfile entry, or if a file is missing or orphaned, with the message "voice lines stale, run `pnpm voice`".

## Testing Decisions

- The Node core is tested through its public behaviour against a fixture manifest and a fake synth worker: what gets generated, regenerated, kept and deleted, the lockfile it writes, per-line overrides and pronunciation substitutions (affecting only their lines, never captions), and the stale check's verdicts.
- The line-map helper is tested for the runtime guard: stale and missing IDs are left out.
- The Python worker is checked by hand through the review page. It's kept tiny so there's little to test.
- Prior art: `apps/play/src/play/voice.test.ts` for the playback side, and the curriculum package's Node tests.

## Out of Scope

- French and other locales, beyond keeping the layout per locale.
- Runtime or on-device generation.
- Per-character voices, and the avatar speaking in a student's chosen voice.
- A CDN and asset loading screens (later, through the one swap point).
- Recorded voice acting.
- Automatic speech-to-text verification.

## Further Notes

- **Machine:** M1 Pro, 16 GB. Orpheus (3B) and Dia (1.6B) were ruled out as too heavy and English-only for little gain. Kokoro, Qwen3-TTS (1.7B VoiceDesign, 0.6B clone) and Chatterbox were compared by ear through [mlx-audio](https://github.com/Blaizzy/mlx-audio). Results and Kokoro setup lessons are in `issues/01-bake-off.md`.
- **Sequencing:** built alongside game-framework step 7. The fractions game (step 8) is the first real consumer, and game-framework step 9 uses this package instead of building voice-line generation.
