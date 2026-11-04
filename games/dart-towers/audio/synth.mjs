// Stand-in sound effects, synthesised so they can be tuned by editing numbers.
// `node audio/synth.mjs <dir>` writes each as a mono WAV; encode with ffmpeg:
//   ffmpeg -i <id>.wav -c:a libvorbis -q:a 4 audio/<id>.ogg
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const rate = 22050;
const dir = process.argv[2] ?? ".";

/** Mixes voices `(t, seconds) => sample` for `seconds`, and writes the WAV. */
function write(id, seconds, voice) {
  const n = Math.floor(seconds * rate);
  const out = Buffer.alloc(44 + n * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, voice(i / rate)));
    out.writeInt16LE(Math.round(s * 32000), 44 + i * 2);
  }
  writeFileSync(join(dir, `${id}.wav`), out);
}

// Fixed seed, so the files come out the same each time.
let seed = 7;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const decay = (t, speed) => Math.exp(-t * speed);
/** Noise smoothed to sit lower: `amount` near 1 is darker. */
const lowNoise = (amount) => {
  let last = 0;
  return () => {
    last = last * amount + noise() * (1 - amount);
    return last;
  };
};
/** A sine whose pitch moves: `hz(t)` is its pitch at t. */
const sweep = (hz) => {
  let phase = 0;
  return (t) => {
    phase += (2 * Math.PI * hz(t)) / rate;
    return Math.sin(phase);
  };
};

// A quick thwip: an airy rush with a falling whistle.
{
  const air = lowNoise(0.35);
  const whistle = sweep((t) => 1500 - t * 7000);
  write(
    "dart-fire",
    0.12,
    (t) => (air() * 1.2 + whistle(t) * 0.35) * decay(t, 32),
  );
}
// A round pop: a pitch that drops fast, with a click on the front.
{
  const body = sweep((t) => 620 * Math.exp(-t * 16) + 150);
  write(
    "bug-pop",
    0.14,
    (t) => body(t) * decay(t, 24) * 0.9 + noise() * decay(t, 260) * 0.4,
  );
}
// Glass: a crack, then bright tinkling pieces.
{
  const pieces = [2350, 3120, 3990, 4730, 5610].map((hz, i) => ({
    hz,
    at: 0.015 + i * 0.038,
    tone: sweep(() => hz),
  }));
  write("glass-smash", 0.42, (t) => {
    let s = noise() * decay(t, 42) * 0.8;
    for (const p of pieces)
      if (t > p.at) s += p.tone(t) * decay(t - p.at, 20) * 0.2;
    return s;
  });
}
// A low thump with dirt in it.
{
  const body = sweep((t) => 120 * Math.exp(-t * 7) + 42);
  const dirt = lowNoise(0.82);
  write(
    "wall-thud",
    0.36,
    (t) => body(t) * decay(t, 10) * 1.1 + dirt() * decay(t, 18) * 1.3,
  );
}
// Three rising notes, soft and bright, for every bug stopped.
{
  const notes = [523.25, 659.25, 783.99].map((hz, i) => ({
    at: i * 0.095,
    tone: sweep(() => hz),
    over: sweep(() => hz * 2),
  }));
  write("wave-clear", 0.65, (t) => {
    let s = 0;
    for (const n of notes)
      if (t > n.at) {
        const d = decay(t - n.at, 7);
        s +=
          (n.tone(t) * 0.3 + n.over(t) * 0.09) *
          d *
          Math.min(1, (t - n.at) * 200);
      }
    return s;
  });
}
