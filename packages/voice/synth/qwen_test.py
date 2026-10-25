"""`pnpm voice:test`: try a Qwen3-TTS VoiceDesign prompt on any text.

    pnpm voice:test -- --prompt "A calm old storyteller" --text "Once upon a time."

Both --prompt and --text are required (except with --clean alone). Writes packages/voice/.review/qwen-test/<name>.mp3 (never committed) and
opens it. Scratch tool: it doesn't touch game voice lines or lockfiles.
"""

import argparse
import subprocess
import sys
from pathlib import Path

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"
OUT_DIR = Path(__file__).resolve().parent.parent / ".review" / "qwen-test"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--prompt", help="voice description (required)")
    ap.add_argument("--text", help="what to say (required)")
    ap.add_argument("--name", default=None, help="output file name (no extension)")
    ap.add_argument("--language", default="English")
    ap.add_argument("--no-open", action="store_true")
    ap.add_argument("--clean", action="store_true",
                    help="delete earlier test clips first (alone, just deletes)")
    args = ap.parse_args()
    if args.clean:
        clips = list(OUT_DIR.glob("*.mp3"))
        for clip in clips:
            clip.unlink()
        print(f"voice:test: deleted {len(clips)} clip(s)")
        if not args.prompt and not args.text:
            return
    missing = [f"--{k}" for k in ("prompt", "text") if not getattr(args, k)]
    if missing:
        ap.error(f"missing {' and '.join(missing)}")

    import numpy as np
    from mlx_audio.tts.utils import load_model

    model = load_model(MODEL)
    results = list(
        model.generate_voice_design(
            text=args.text, language=args.language, instruct=args.prompt
        )
    )
    audio = np.concatenate([np.array(r.audio) for r in results]).astype("float32")
    rate = getattr(model, "sample_rate", 24000)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    name = args.name or f"test-{len(list(OUT_DIR.glob('*.mp3'))) + 1}"
    out = OUT_DIR / f"{name}.mp3"
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-f", "f32le", "-ar", str(rate), "-ac", "1", "-i", "-",
         "-af", "loudnorm=I=-16:TP=-1.5", str(out)],
        input=audio.tobytes(),
    )
    if proc.returncode != 0:
        sys.exit("voice:test: ffmpeg failed")
    print(out)
    if not args.no_open:
        subprocess.run(["open", str(out)])


if __name__ == "__main__":
    main()
