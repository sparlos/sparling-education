// Where everything is (SPEC.md's Mechanic): the mountain, and one stretch of
// track, both in the board's 1000 × 600 viewBox. A stretch is drawn small on
// the mountain's face, so the camera really does zoom in on it. Distances
// along a stretch are its x. Plain geometry, so the screen and its tests agree.

export const viewBox = { width: 1000, height: 600 } as const;

// ---- One stretch ----

const slope = 0.22;
const angle = (-Math.atan(slope) * 180) / Math.PI;

/** The height of the track at x. */
export const trackY = (x: number) => 500 - x * slope;

/** The point at distance `s` along the track, and the way it faces (degrees). */
export const pointAt = (s: number) => ({ x: s, y: trackY(s), angle });

/** How far the wagon rides behind the engine's middle. */
export const wagonGap = 104;
/** Where the engine waits at the start, ready to leave. */
export const startAt = 270;
/** The gate across the track. */
export const gateAt = 850;
/** Where the engine waits at the shut gate. */
export const gateWaitAt = 790;
/** Far enough past the gate for the whole train to be off the screen. */
export const pastGateAt = 1200;

/** How high a sign's middle stands above the track, clear of the train under it. */
const signHeight = 190;
const sign = (x: number) => ({ x, y: trackY(x) - signHeight });

export const startSign = sign(110);
export const gateSign = sign(880);

/** A stop's sign, at the middle with one stop, and spread out with two. */
export function stopSign(count: number, i: number) {
  return sign(count === 1 ? 520 : i === 0 ? 420 : 650);
}

/** Where the engine stops so its wagon is right under stop i's sign. */
export const stopAt = (count: number, i: number) =>
  stopSign(count, i).x + wagonGap;

// ---- The mountain ----

export const valley = { x: 94, y: 569 };
/** The gate at the end of each trip's stretch, from the valley up. */
export const gates = [
  { x: 240, y: 512 },
  { x: 385, y: 425 },
  { x: 510, y: 356 },
  { x: 625, y: 275 },
  { x: 729, y: 187 },
  { x: 807, y: 100 },
] as const;
export const summit = { x: 833, y: 42 };
/** The end of the tutorial's practice track, at the foot of the mountain. */
const practiceEnd = { x: 160, y: 543 };

const lerp = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The gate at the end of trip n (1 to 6); the practice track's end for 0. */
export const gateOf = (n: number) => gates[n - 1] ?? practiceEnd;

/** Where the tiny train waits before the camera zooms in on trip n. */
export const waitingFor = (n: number) =>
  lerp(n <= 1 ? valley : gateOf(n - 1), gateOf(n), 0.45);

/** A stretch is drawn this small on the mountain. */
export const stretchScale = 0.12;

/** Where trip n's stretch sits on the mountain: its gate on the mountain's gate. */
export function stretchAt(n: number) {
  const gate = gateOf(n);
  return {
    x: gate.x - gateAt * stretchScale,
    y: gate.y - trackY(gateAt) * stretchScale,
    width: viewBox.width * stretchScale,
    height: viewBox.height * stretchScale,
  };
}

/** A touch past filling the picture, so no sliver of the mountain shows at its edge. */
const overscan = 1.004;

/** The camera's move that fills the screen with trip n's stretch. */
export function zoomOn(n: number): string {
  const { x, y, width, height } = stretchAt(n);
  const k = (1 / stretchScale) * overscan;
  // Centred, so the overscan hides the mountain's edge on every side.
  const inX = (viewBox.width - width * k) / 2;
  const inY = (viewBox.height - height * k) / 2;
  return `translate(${inX - x * k}px, ${inY - y * k}px) scale(${k})`;
}

/** The camera's move that shows the whole mountain. */
export const wholeMountain = "translate(0px, 0px) scale(1)";

/** The mountain's outline, and where its parts meet. */
export const mountainOutline = "42,600 833,25 1000,300 1000,600";
export const forestLine = 418;
export const rockLine = 268;
