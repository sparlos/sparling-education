// The night's colours and the sun's height (SPEC.md's Journey table), the
// splash's garden from dark to morning. `t` runs from 0 (dark) to 1 (morning),
// and each list has one colour a wave, from before wave 1 to after wave 6, so
// the sky never mixes through grey. After wave 3 is the splash's own colours
// (art/splash.svg), so they're written as it has them.
const skyTopStops = [
  "#1c1850",
  "#2f2a7a",
  "#5a4fb0",
  "#7d79c6",
  "#b08fc9",
  "#f2d9a0",
  "#9dd0f5",
];
const skyMidStops = [
  "#2a2470",
  "#43389a",
  "#8a72c8",
  "#c4b6e8",
  "#f0b8c0",
  "#fbe6b8",
  "#cfe4f8",
];
const skyLowStops = [
  "#3d3488",
  "#6a55b4",
  "#c28fc8",
  "#ffd9c2",
  "#ffd2a8",
  "#fff3cc",
  "#e8f3fb",
];
const farHillStops = [
  "#241f5c",
  "#342e7c",
  "#6a5eaa",
  "#cbbfe8",
  "#d9b8d0",
  "#d6d4b0",
  "#bfe0c8",
];
const nearHillStops = [
  "#1b2752",
  "#2a3a70",
  "#4f6e8a",
  "#a9cca3",
  "#a6c996",
  "#9fce92",
  "#93cf84",
];
const pineStops = [
  "#16224a",
  "#243363",
  "#3f5f7c",
  "#93bf8d",
  "#8cba80",
  "#86bd78",
  "#79b96c",
];
const fieldTopStops = [
  "#1a2a40",
  "#264050",
  "#3a6258",
  "#5f9a66",
  "#78b36c",
  "#8dc979",
  "#a6e584",
];
const fieldLowStops = [
  "#142034",
  "#1e3640",
  "#2f5448",
  "#4f8a55",
  "#5fa25a",
  "#6fb85a",
  "#7fcc68",
];

export function mix(stops: readonly string[], t: number): string {
  const at = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(at);
  const channel = (hex: string, c: number) =>
    Number.parseInt(hex.slice(1 + c * 2, 3 + c * 2), 16);
  const from = stops[i] ?? "#000000";
  const to = stops[i + 1] ?? from;
  const rgb = [0, 1, 2].map((c) =>
    Math.round(
      channel(from, c) + (channel(to, c) - channel(from, c)) * (at - i),
    ),
  );
  return `rgb(${rgb.join(",")})`;
}

export const nightColours = (t: number) => ({
  sky: [mix(skyTopStops, t), mix(skyMidStops, t), mix(skyLowStops, t)] as const,
  farHills: mix(farHillStops, t),
  nearHills: mix(nearHillStops, t),
  pines: mix(pineStops, t),
  field: [mix(fieldTopStops, t), mix(fieldLowStops, t)] as const,
  /** The stars go out as the sky lightens. */
  stars: Math.max(0, 1 - t * 1.4),
  /** The clouds show up as it does. */
  clouds: Math.min(0.75, t * 1.5),
});

/** How far above the hills the sun's middle is: hidden at first, clear of the hills after wave 5. */
export const sunHeight = (t: number) => t * 150 - 80;

/** How far the hills drop as the view tilts up at the end. */
export const tilt = 130;
