// Shared bits for the second round of multiplication prototypes (gate-run,
// dart-towers): the journey strip and small drawing helpers. Rough; see README.md.
import { palette } from "@repo/tokens";

/** Runs `step` from 0 to 1 over `ms`, once a frame. */
export function tween(ms: number, step: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      step(t);
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** One path holding the squares of a grid from index `from` up to `to`, row by row. */
export function gridPath(
  rows: number,
  cols: number,
  x: number,
  y: number,
  cell: number,
  from = 0,
  to = rows * cols,
): string {
  const size = cell * 0.8;
  const parts: string[] = [];
  for (let i = from; i < to; i++) {
    const cx = x + (i % cols) * cell;
    const cy = y + Math.floor(i / cols) * cell;
    parts.push(`M${cx} ${cy}h${size}v${size}h${-size}z`);
  }
  return parts.join("");
}

/**
 * The trip across the top: six stops, each bigger than the last, ending in a
 * big one whose flag turns green. `at` may be between stops while it moves.
 */
export function JourneyStrip({
  at,
  total,
  finished,
}: {
  at: number;
  total: number;
  finished: boolean;
}) {
  const left = 40;
  const right = 890;
  const y = 26;
  const stopX = (i: number) => left + ((right - left) * (i + 1)) / total;
  const dotX = left + ((right - left) * at) / total;
  const last = stopX(total - 1);
  return (
    <g>
      <line
        x1={left}
        x2={right}
        y1={y}
        y2={y}
        stroke={palette.ink[3]}
        strokeWidth={6}
      />
      {Array.from({ length: total }, (_, i) => {
        const r = 7 + i * 2.2;
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed stops
            key={i}
            cx={stopX(i)}
            cy={y}
            r={r}
            fill={i < at ? palette.leaf[5] : palette.ink[2]}
            stroke={palette.ink[6]}
            strokeWidth={2}
          />
        );
      })}
      <line
        x1={last}
        x2={last}
        y1={y - 16}
        y2={y - 2}
        stroke={palette.ink[8]}
        strokeWidth={3}
      />
      <polygon
        points={`${last},${y - 24} ${last + 30},${y - 16} ${last},${y - 8}`}
        fill={finished ? palette.leaf[5] : palette.ink[3]}
      />
      <circle
        cx={dotX}
        cy={y}
        r={8}
        fill={palette.sky[6]}
        stroke="white"
        strokeWidth={3}
      />
    </g>
  );
}

/** The confetti of the last moment: same for every student. */
export function Bursts({ t }: { t: number }) {
  return (
    <g>
      {Array.from({ length: 40 }, (_, i) => {
        const a = i * 2.4;
        const r = 40 + ((i * 37) % 300) * t;
        const colours = [palette.sunshine[5], palette.sky[5], palette.leaf[5]];
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed bursts
            key={i}
            cx={480 + Math.cos(a) * r * 1.3}
            cy={240 + Math.sin(a) * r * 0.65}
            r={7}
            opacity={t < 1 ? 1 : 0.8}
            fill={colours[i % 3]}
          />
        );
      })}
    </g>
  );
}
