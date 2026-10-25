"""Voice-over worker for @repo/marketing: one JSON request on stdin.

{"voice": {"model", "voice", "langCode"},
 "lines": [{"id", "text", "speed", "wav", "words"}]}

The same Kokoro voice as the games (@repo/voice's narrator): each line is
spoken at the model's natural speed with the vocoder seeded, so it's
deterministic, then trimmed, slowed or sped up with ffmpeg's time-stretch,
set to -16 LUFS and written as a 48 kHz mono WAV at `wav` (the games get a
48 kbps MP3; a video wants the full quality). Then Whisper times each word of
the finished audio and writes `[{text, start, end}]` seconds to `words`;
mapping those onto the caption's exact words is the Node side's job.

Runs in @repo/voice's uv environment, which has mlx-audio and the espeak
shim (synth.espeak). Models load one at a time.
"""

import gc
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

WORDS_MODEL = os.environ.get(
    "MARKETING_WORDS_MODEL", "mlx-community/whisper-large-v3-turbo-asr-fp16"
)
OUT_RATE = 48000
TARGET_LUFS = -16.0
TRUE_PEAK_DB = -1.5
# The same trim as @repo/voice (synth/cli.py), so lines start alike.
SILENCE_THRESHOLD = 0.002
EDGE_PAD_SECONDS = 0.05


def fail(message: str) -> None:
    print(f"vo: {message}", file=sys.stderr)
    sys.exit(1)


def log(message: str) -> None:
    print(f"vo: {message}", file=sys.stderr, flush=True)


def trim(audio, rate: int):
    import numpy as np

    loud = np.flatnonzero(np.abs(audio) > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    pad = int(EDGE_PAD_SECONDS * rate)
    return audio[max(0, loud[0] - pad) : loud[-1] + 1 + pad]


def ffmpeg(args: list[str], audio, rate: int):
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-y",
         "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", "-", *args],
        input=audio.astype("float32").tobytes(),
        capture_output=True,
    )
    if proc.returncode != 0:
        fail(f"ffmpeg failed: {proc.stderr.decode(errors='replace')[-600:]}")
    return proc.stderr.decode(errors="replace")


def encode(audio, rate: int, out: Path, speed: float) -> None:
    """Tempo, then the exact gain to hit the target (measured first), then a
    peak limiter, at 48 kHz."""
    tempo = f"atempo={speed:g}," if speed != 1 else ""
    text = ffmpeg(["-af", f"{tempo}loudnorm=print_format=json", "-f", "null", "-"], audio, rate)
    try:
        measured = float(json.loads(text[text.rindex("{") : text.rindex("}") + 1])["input_i"])
        gain = TARGET_LUFS - measured if measured > -70 else 0.0
    except (ValueError, KeyError):
        gain = 0.0
    limit = 10 ** (TRUE_PEAK_DB / 20)
    chain = (
        f"{tempo}volume={gain:.3f}dB,aresample={OUT_RATE},"
        f"alimiter=limit={limit:.4f}:level=false"
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(["-af", chain, "-ar", str(OUT_RATE), "-ac", "1", "-c:a", "pcm_s16le", str(out)], audio, rate)


def free(model) -> None:
    import mlx.core as mx

    del model
    gc.collect()
    mx.clear_cache()


def speak(voice: dict, lines: list[dict]) -> None:
    # Before misaki is imported (see @repo/voice's synth/espeak.py).
    from synth.espeak import install_short_paths

    install_short_paths()

    import mlx.core as mx
    import numpy as np
    from mlx_audio.tts.utils import load_model

    log(f"loading {voice['model']}")
    model = load_model(voice["model"])
    rate = getattr(model, "sample_rate", 24000)
    for line in lines:
        log(f"speaking {line['id']}: {line['text']}")
        # As in @repo/voice: seeded vocoder noise, natural speed (Kokoro's own
        # slow-down adds an "a-" before unvoiced starts; ffmpeg does tempo).
        mx.random.seed(0)
        chunks = [
            np.asarray(r.audio, dtype="float32").reshape(-1)
            for r in model.generate(
                text=line["text"],
                voice=voice["voice"],
                speed=1.0,
                lang_code=voice["langCode"],
            )
        ]
        if not chunks:
            fail(f"no audio for {line['id']}")
        encode(trim(np.concatenate(chunks), rate), rate, Path(line["wav"]), float(line["speed"]))
    free(model)


def time_words(lines: list[dict]) -> None:
    from mlx_audio.stt import load

    log(f"loading {WORDS_MODEL}")
    model = load(WORDS_MODEL)
    for line in lines:
        result = model.generate(
            line["wav"],
            language="en",
            word_timestamps=True,
            initial_prompt=line["text"],
            condition_on_previous_text=False,
            temperature=0.0,
        )
        words = [
            {"text": w["word"].strip(), "start": float(w["start"]), "end": float(w["end"])}
            for segment in (result.segments or [])
            for w in segment.get("words", [])
        ]
        Path(line["words"]).write_text(json.dumps(words, indent=1))
        log(f"timed {line['id']}: {len(words)} words")
    free(model)


def main() -> None:
    if not shutil.which("ffmpeg"):
        fail("ffmpeg isn't installed (brew install ffmpeg)")
    request = json.load(sys.stdin)
    if request["lines"]:
        speak(request["voice"], request["lines"])
        time_words(request["lines"])


if __name__ == "__main__":
    main()
