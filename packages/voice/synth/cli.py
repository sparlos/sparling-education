"""`uv run synth`: one JSON request on stdin, one MP3 per line.

{"voice": {"model", "voice", "langCode"},
 "lines": [{"text", "speed", "outPath"}]}

Knows nothing about games, hashes or lockfiles. Exits non-zero with a message
on stderr if ffmpeg is missing, the model fails to load, or a line fails.
"""

import json
import shutil
import sys
import time
from pathlib import Path

# Bump AUDIO_FORMAT in src/hash.ts whenever any of these change.
SAMPLE_RATE = 24000  # Kokoro's output rate
TARGET_LUFS = -16.0
TRUE_PEAK_DB = -1.5
MP3_BITRATE = "48k"
SILENCE_THRESHOLD = 0.002  # about -54 dBFS
EDGE_PAD_SECONDS = 0.05  # natural-sounding breath at each edge


def fail(message: str) -> None:
    print(f"synth: {message}", file=sys.stderr)
    sys.exit(1)


def trim_silence(audio):
    import numpy as np

    loud = np.flatnonzero(np.abs(audio) > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    pad = int(EDGE_PAD_SECONDS * SAMPLE_RATE)
    return audio[max(0, loud[0] - pad) : loud[-1] + 1 + pad]


def run_ffmpeg(ffmpeg_bin: str, filter_chain: str, audio, out: list[str]):
    import subprocess

    proc = subprocess.run(
        [
            ffmpeg_bin, "-hide_banner", "-nostdin", "-y",
            "-f", "f32le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "-",
            "-af", filter_chain, *out,
        ],
        input=audio.astype("float32").tobytes(),
        capture_output=True,
    )
    if proc.returncode != 0:
        fail(f"ffmpeg failed: {proc.stderr.decode(errors='replace')[-600:]}")
    return proc


def encode(ffmpeg_bin: str, audio, out_path: Path, speed: float) -> None:
    """Slow or speed up to `speed` (pitch kept), measure integrated loudness,
    apply the exact gain to hit the target, cap peaks with a limiter, and
    encode mono MP3.

    (loudnorm's own linear mode silently falls back to dynamic mode when the
    gain would exceed the true-peak limit, which left some lines at -20 LUFS.)
    """
    tempo = f"atempo={speed:g}," if speed != 1 else ""
    measure = run_ffmpeg(
        ffmpeg_bin, f"{tempo}loudnorm=print_format=json", audio, ["-f", "null", "-"]
    )
    text = measure.stderr.decode(errors="replace")
    try:
        measured = float(json.loads(text[text.rindex("{") : text.rindex("}") + 1])["input_i"])
        gain = TARGET_LUFS - measured if measured > -70 else 0.0
    except (ValueError, KeyError):
        gain = 0.0  # silent or too short to measure
    limit = 10 ** (TRUE_PEAK_DB / 20)
    chain = f"{tempo}volume={gain:.3f}dB,alimiter=limit={limit:.4f}:level=false"
    tmp = out_path.with_name(f".{out_path.name}.part")
    run_ffmpeg(
        ffmpeg_bin, chain, audio,
        ["-ac", "1", "-c:a", "libmp3lame", "-b:a", MP3_BITRATE,
         "-map_metadata", "-1", "-flags", "+bitexact", "-f", "mp3", str(tmp)],
    )
    tmp.replace(out_path)


def main() -> None:
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin is None:
        fail("ffmpeg not found on PATH (macOS: brew install ffmpeg)")

    try:
        request = json.load(sys.stdin)
        voice = request["voice"]
        lines = request["lines"]
    except (ValueError, KeyError) as e:
        fail(f"bad request on stdin: {e!r}")

    # Before misaki is imported (see espeak.py).
    from .espeak import install_short_paths

    install_short_paths()

    import numpy as np

    started = time.perf_counter()
    try:
        from mlx_audio.tts.utils import load_model

        model = load_model(voice["model"])
    except Exception as e:  # noqa: BLE001
        fail(f"could not load model {voice.get('model')!r}: {e!r}")
    print(f"synth: model loaded in {time.perf_counter() - started:.2f}s")

    import mlx.core as mx

    for line in lines:
        t0 = time.perf_counter()
        try:
            # Kokoro's vocoder draws random noise, so unseeded output differs
            # run to run. Seeding per line makes a line's audio depend only on
            # its text and settings, not on what was generated before it.
            mx.random.seed(0)
            chunks = [
                np.asarray(r.audio, dtype="float32").reshape(-1)
                # Always speak at the model's natural speed and slow it down
                # in ffmpeg instead: Kokoro's own speed below 1 adds a short
                # "a-" before lines that start with an unvoiced sound
                # ("three fourths", "Too short.").
                for r in model.generate(
                    text=line["text"],
                    voice=voice["voice"],
                    speed=1.0,
                    lang_code=voice["langCode"],
                )
            ]
            if not chunks:
                raise RuntimeError("the model produced no audio")
            audio = trim_silence(np.concatenate(chunks))
            out = Path(line["outPath"])
            out.parent.mkdir(parents=True, exist_ok=True)
            encode(ffmpeg_bin, audio, out, line["speed"])
        except SystemExit:
            raise
        except Exception as e:  # noqa: BLE001
            fail(f"failed on {line['text']!r}: {e!r}")
        print(f"synth: {out.name} {time.perf_counter() - t0:.2f}s")


if __name__ == "__main__":
    main()
