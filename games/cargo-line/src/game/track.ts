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

// On the mountain's art: its trail runs from the valley to its peak.
export const valley = { x: 96, y: 563 };
/** The gate at the end of each trip's stretch, from the valley up. */
export const gates = [
  { x: 229, y: 509 },
  { x: 360, y: 428 },
  { x: 474, y: 363 },
  { x: 578, y: 287 },
  { x: 672, y: 204 },
  { x: 743, y: 122 },
] as const;
export const summit = { x: 767, y: 68 };
/** The end of the tutorial's practice track, at the foot of the mountain. */
const practiceEnd = { x: 156, y: 538 };

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

/**
 * The way the route climbs at a point on it, in degrees: along the stretch
 * heading on from there, so the tiny train lies on the line it's moving along.
 */
export function routeAngleAt(p: { x: number }): number {
  const route = [valley, ...gates, summit];
  const to = route.findIndex((q) => p.x < q.x);
  const end = route[to === -1 ? route.length - 1 : to] ?? summit;
  const start =
    route[to === -1 ? route.length - 2 : Math.max(0, to - 1)] ?? valley;
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
}

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

/** Shares of the picture, for a layer's CSS move. */
const move = (x: number, y: number, k: number) =>
  `translate(${(x / viewBox.width) * 100}%, ${(y / viewBox.height) * 100}%) scale(${k})`;

/** Where the camera puts trip n's stretch when it's close: filling the picture. */
function closeOn(n: number) {
  const { x, y, width, height } = stretchAt(n);
  const k = (1 / stretchScale) * overscan;
  // Centred, so the overscan hides the mountain's edge on every side.
  const inX = (viewBox.width - width * k) / 2;
  const inY = (viewBox.height - height * k) / 2;
  return { x, y, k, inX, inY };
}

/** The mountain's move that fills the screen with trip n's stretch. */
export function zoomOn(n: number): string {
  const { x, y, k, inX, inY } = closeOn(n);
  return move(inX - x * k, inY - y * k, k);
}

/** The stretch's own move when the camera's on it, in step with the mountain's. */
export function stretchClose(n: number): string {
  const { k, inX, inY } = closeOn(n);
  return move(inX, inY, k * stretchScale);
}

/** The stretch's move when the camera's back: small, on the mountain's face. */
export function stretchFar(n: number): string {
  const { x, y } = stretchAt(n);
  return move(x, y, stretchScale);
}

/** The camera's move that shows the whole mountain. */
export const wholeMountain = "translate(0%, 0%) scale(1)";
