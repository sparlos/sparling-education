// The loop from above (SPEC.md's Mechanic): a rounded rectangle of track
// in the board's 1000 × 600 viewBox, with the yard at the bottom middle.
// Distances are measured along the track from the yard, the way the train
// goes: right along the bottom, up the right side, across the top, down
// the left side and back. Plain geometry, so the screen and its tests agree
// on where everything is.

export const viewBox = { width: 1000, height: 600 } as const;

const left = 110;
const right = 890;
const top = 95;
const bottom = 500;
const r = 110;
const mid = (left + right) / 2;

export const trackBox = { left, right, top, bottom, r } as const;

interface Segment {
  length: number;
  at(t: number): { x: number; y: number; angle: number };
}

const line = (x0: number, y0: number, x1: number, y1: number): Segment => {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const angle = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI;
  return {
    length,
    at: (t) => ({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, angle }),
  };
};

/** A quarter turn about (cx, cy), from angle a0 (degrees, SVG's) by −90. */
const arc = (cx: number, cy: number, a0: number): Segment => ({
  length: (Math.PI * r) / 2,
  at: (t) => {
    const a = ((a0 - 90 * t) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
      angle: a0 - 90 * t - 90,
    };
  },
});

const segments: Segment[] = [
  line(mid, bottom, right - r, bottom),
  arc(right - r, bottom - r, 90),
  line(right, bottom - r, right, top + r),
  arc(right - r, top + r, 0),
  line(right - r, top, left + r, top),
  arc(left + r, top + r, -90),
  line(left, top + r, left, bottom - r),
  arc(left + r, bottom - r, -180),
  line(left + r, bottom, mid, bottom),
];

/** Once round the loop. */
export const loopLength = segments.reduce((sum, s) => sum + s.length, 0);

/** The point at distance `s` along the track, and the way it faces (degrees). */
export function pointAt(s: number) {
  let rest = ((s % loopLength) + loopLength) % loopLength;
  for (const seg of segments) {
    if (rest <= seg.length) return seg.at(rest / seg.length);
    rest -= seg.length;
  }
  return (segments.at(-1) as Segment).at(1);
}

/** The track as an SVG path, the same way round. */
export const trackPath = [
  `M ${mid} ${bottom}`,
  `L ${right - r} ${bottom}`,
  `A ${r} ${r} 0 0 0 ${right} ${bottom - r}`,
  `L ${right} ${top + r}`,
  `A ${r} ${r} 0 0 0 ${right - r} ${top}`,
  `L ${left + r} ${top}`,
  `A ${r} ${r} 0 0 0 ${left} ${top + r}`,
  `L ${left} ${bottom - r}`,
  `A ${r} ${r} 0 0 0 ${left + r} ${bottom}`,
  "Z",
].join(" ");

/** How far the wagon rides behind the engine's middle. */
export const wagonGap = 78;
/** Where the engine waits in the yard, ready to leave, and where it ends a lap. */
export const yardAt = 40;
/** Where it waits at the shut gate, coming back. */
export const gateWaitAt = loopLength - 120;
/** The gate across the track, just before the yard. */
export const gateAt = loopLength - 60;

/** Each station's spot along the track: the top with one, the two sides with two. */
export function stationAt(count: number, i: number): number {
  const side = right - r - mid + (Math.PI * r) / 2 + (bottom - top - 2 * r) / 2;
  if (count === 1) return loopLength / 2;
  return i === 0 ? side : loopLength - side;
}

/** Where the engine stops so its wagon is right beside station i. */
export const stopAt = (count: number, i: number) =>
  stationAt(count, i) + wagonGap;
