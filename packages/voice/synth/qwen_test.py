"""`pnpm voice:test`: try a Qwen3-TTS VoiceDesign prompt on any text.

    pnpm voice:test -- --prompt "A calm old storyteller" --text "Once upon a time."
    pnpm voice:test -- --prompt "A calm old storyteller" --file story.txt

--prompt and one of --text or --file are required (except with --clean alone). Writes packages/voice/.review/qwen-test/<name>.mp3 (never committed) and
opens it. Scratch tool: it doesn't touch game voice lines or lockfiles.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"
OUT_DIR = Path(__file__).resolve().parent.parent / ".review" / "qwen-test"
CHUNK_CHARS = 300


def split_text(text: str) -> list[str]:
    """Group whole sentences into chunks of about CHUNK_CHARS."""
    chunks = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if current and len(current) + len(sentence) + 1 > CHUNK_CHARS:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    return [*chunks, current]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--prompt", help="voice description (required)")
    source = ap.add_mutually_exclusive_group()
    source.add_argument("--text", help="what to say")
    source.add_argument("--file", type=Path, help="txt file with what to say")
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
        if not args.prompt and not args.text and not args.file:
            return
    missing = []
    if not args.prompt:
        missing.append("--prompt")
    if not args.text and not args.file:
        missing.append("--text or --file")
    if missing:
        ap.error(f"missing {' and '.join(missing)}")
    text = args.text
    if args.file:
        try:
            text = args.file.read_text(encoding="utf-8").strip()
        except OSError as err:
            ap.error(f"can't read --file: {err}")
        if not text:
            ap.error(f"--file is empty: {args.file}")

    import numpy as np
    from mlx_audio.tts.utils import load_model

    model = load_model(MODEL)
    chunks = split_text(text)
    pieces = []
    for i, chunk in enumerate(chunks, 1):
        print(f"voice:test: part {i}/{len(chunks)} ({len(chunk)} chars)", flush=True)
        results = model.generate_voice_design(
            text=chunk, language=args.language, instruct=args.prompt
        )
        pieces.extend(np.array(r.audio) for r in results)
    audio = np.concatenate(pieces).astype("float32")
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
