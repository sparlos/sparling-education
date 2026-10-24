# 03: Python synth worker (Kokoro)

Status: resolved

Blocked by: 02

Spec: `../spec.md` (Package shape, Audio format, Voice registry)

## What

- A uv project inside `packages/voice` (`pyproject.toml`, `uv.lock`) with one entry point, `uv run synth`. It reads `{ voice: { model, voice, langCode }, lines: [{ text, speed, outPath }] }` on stdin, loads Kokoro (`mlx-community/Kokoro-82M-8bit`) once through mlx-audio, and for each line it:
  - synthesises with the given voice, language code and speed,
  - trims leading and trailing silence, normalises to −16 LUFS, and encodes mono MP3 at ~48 kbps with ffmpeg,
  - writes the file to `outPath`.
- It exits non-zero with a clear message if ffmpeg or the model is missing.
- Apply the setup lessons in `01-bake-off.md`'s Answer: Python 3.12, the extra Kokoro dependencies (misaki, espeakng-loader, spacy, phonemizer-fork, num2words, spaCy `en_core_web_sm` 3.8.0), and a robust fix for espeak-ng failing on long data or library paths.
- Keep the model in the normal Hugging Face cache (it's 0.3 GB) unless there's a reason not to; document where it lands.
- The package README covers one-time setup (uv, ffmpeg, the model download and where it's cached) and how to run, review, and fix a line with the pronunciation map or an override.

## Done when

- `pnpm voice` against a fixture or real game produces lines the founder approves on the review page.
- A rerun with no changes synthesises nothing, and deleting a file and regenerating it gives identical audio.

## Comments

Built the worker: `packages/voice/synth/` (`cli.py`, `espeak.py`), `pyproject.toml`, `.python-version` (3.12), `uv.lock`, `README.md`. Verified on a throwaway fixture (8 lines): all MP3s mono, 48 kbps, -16.3 to -16.8 LUFS, rerun generates nothing, deleting files regenerates byte-identical MP3s (3 trials, in a different batch order). Per line 0.23-0.39 s warm; first line of a run ~1.8 s (pipeline warm-up); model load 0.3 s warm, ~8 s on first download.

- Kokoro is NOT deterministic by default: its vocoder draws random noise (amplitude differences up to 0.1 between runs). The worker seeds `mx.random.seed(0)` per line, which makes output byte-identical. The spec's "deterministic" claim holds only with this seed.
- Loudness is a measured gain plus a -1.5 dB limiter, not loudnorm's linear mode, which silently fell back to dynamic and left some lines at -20 LUFS.
- espeak: short per-user dir at `/tmp/kv-espeak-<uid>` (dylib copy, data symlink), patched into `espeakng_loader` before misaki imports. I did not test whether the repo venv path alone fails.
- `AUDIO_FORMAT` constant in `src/hash.ts` is hashed into every line (bump it when trim/LUFS/bitrate change). `pnpm voice --root <dir>` added.
- Not done: the founder still needs to listen to the fixture lines and approve the voice and levels.
