# 01: Narrator bake-off

Status: resolved

Spec: `../spec.md`

## What

A throwaway comparison so the founder can pick the narrator model and voice by ear. Nothing from it goes into the repo except the winning reference clip and its settings, which issue 03 uses.

## Steps

1. Make one throwaway folder in the session scratchpad. Inside it go the uv venv, `HF_HOME` (so every model download lands there) and all output. Scripts live in a sibling folder, not next to downloads.
2. Pick ~10 real lines, mixing whole sentences, short fragments and math words: lines from the lab prototypes, and the Plank Bridge examples in `.scratch/game-framework/build-log.md` ("This gap needs" / "three fourths" / "of a plank.", "Too short.", "one twelfth", "Let's try again.").
3. Generate every line with each candidate through mlx-audio:
   1. **Kokoro**, built-in adult female voices (e.g. `af_heart`, `bf_emma`),
   2. **Qwen3-TTS 1.7B VoiceDesign**, from a prompt like "warm, clear adult female primary teacher, patient, encouraging, unhurried",
   3. **Qwen3-TTS 0.6B Base**, cloned from a clip #2 designed,
   4. **Chatterbox**, cloned from that same designed clip.
4. Record seconds per line, the real-time factor and peak memory for each, on the founder's M1 Pro (16 GB).
5. Write a local HTML page that plays the candidates side by side for each line, with the timings.
6. The founder listens and picks. Re-run voice design with tweaked prompts if no designed voice feels right.
7. Save the winner's reference clip, its transcript, the design prompt, the model ID and the settings into this issue's Answer, and copy the clip somewhere safe for issue 03.
8. **Clean up:** delete the whole throwaway folder, then confirm `~/.cache/huggingface` and other global caches weren't touched (compare sizes before and after).

## Done when

- The founder has picked a model and a narrator voice.
- The decision is recorded below, and disk use is back to where it started.

## Comments

## Answer

**Winner (founder's pick, 2026-10-24): Kokoro, voice `af_heart`.** Model `mlx-community/Kokoro-82M-8bit` through mlx-audio, `lang_code="a"` (American English), `speed=1.0`. No reference clip: Kokoro uses built-in voices, so the narrator is just the model ID, voice and speed.

Results on the M1 Pro (warm, 10 lines):

| Candidate | Load | Mean s/line | RTF | Peak footprint | Download |
|---|---|---|---|---|---|
| Kokoro `af_heart` | 0.13 s | 0.41 (median 0.12) | 0.21 | 2.5 GB | 0.31 GB |
| Kokoro `bf_emma` | same | 0.23 | 0.12 | same | same |
| Qwen3 1.7B VoiceDesign (two prompts) | 2.4 s | ~0.96 | 0.59 | 11.1 GB | 3.0 GB |
| Qwen3 0.6B Base clone | 2.2 s | 1.64 | 1.12 | 11.1 GB | 1.95 GB |
| Chatterbox clone | 1.6 s | 2.54 | 0.99 | 5.9 GB | 1.25 GB (+0.47 GB tokenizer) |

Setup lessons for issue 03:
- Kokoro under mlx-audio also needs `misaki`, `espeakng-loader`, `spacy`, `phonemizer-fork`, `num2words`, and the spaCy `en_core_web_sm` 3.8.0 wheel (installed from its GitHub release URL).
- espeak-ng fails when its data or library path is long. The bake-off worked around it by pointing `espeakng_loader.get_data_path` / `get_library_path` at a short directory (a copy of the dylib plus a symlink to the data). Issue 03 needs a robust version of this, or should keep the venv on a short path.
- Use Python 3.12 for the venv. The machine's default is 3.14, which mlx-audio's dependencies may not support.

Cleanup: the bake-off folder (7.1 GB) and scripts were deleted. `~/.cache/huggingface` (2.9 GB) and `~/.cache` (8.4 GB) are unchanged from before the bake-off.
