// The logo's mark: a faceted gem with a gold sparkle on its top-right corner,
// like a badge. Plain geometry, so the React wordmark, the videos and the
// logo files in @repo/brand all draw the same shape.
//
// Units: the gem fills a 120 × 100 box (girdle at y 35, tip at y 100). The
// sparkle pokes above and to the right of it; `markBox` is the whole mark.

type Point = readonly [number, number];

const point = {
  girdleLeft: [0, 35],
  crownLeft: [32, 0],
  crownRight: [88, 0],
  girdleRight: [120, 35],
  tip: [60, 100],
  tableTopLeft: [35.5, 0],
  tableTopRight: [84.5, 0],
  tableBottomLeft: [48, 35],
  tableBottomRight: [72, 35],
} as const satisfies Record<string, Point>;

const polygon = (points: readonly Point[]) =>
  `M${points.map((p) => p.join(",")).join("L")}Z`;

const round = (n: number) => Math.round(n * 100) / 100;

/** A closed outline with each corner rounded by a quadratic curve. */
function roundedOutline(points: readonly Point[], radii: readonly number[]) {
  return `${points
    .map(([x, y], i) => {
      const prev = points[(i - 1 + points.length) % points.length] as Point;
      const next = points[(i + 1) % points.length] as Point;
      const toward = ([ax, ay]: Point): Point => {
        const length = Math.hypot(ax - x, ay - y);
        const t = Math.min(radii[i] ?? 0, length / 2) / length;
        return [round(x + (ax - x) * t), round(y + (ay - y) * t)];
      };
      const from = toward(prev);
      const to = toward(next);
      return `${i === 0 ? "M" : "L"}${from.join(",")}Q${x},${y} ${to.join(",")}`;
    })
    .join("")}Z`;
}

/** The gem's silhouette, with softened corners. Facets are clipped to it. */
export const gemOutline = roundedOutline(
  [
    point.girdleLeft,
    point.crownLeft,
    point.crownRight,
    point.girdleRight,
    point.tip,
  ],
  [5, 7, 7, 5, 6],
);

/** The gem's facets, lit from the top left. */
export const gemFacets = [
  {
    name: "crown left",
    d: polygon([
      point.girdleLeft,
      point.crownLeft,
      point.tableTopLeft,
      point.tableBottomLeft,
    ]),
    fill: "#7558FF",
  },
  {
    name: "table",
    d: polygon([
      point.tableTopLeft,
      point.tableTopRight,
      point.tableBottomRight,
      point.tableBottomLeft,
    ]),
    fill: "#CBB7FE",
  },
  {
    name: "crown right",
    d: polygon([
      point.tableTopRight,
      point.crownRight,
      point.girdleRight,
      point.tableBottomRight,
    ]),
    fill: "#8E76FF",
  },
  {
    name: "pavilion left",
    d: polygon([point.girdleLeft, point.tableBottomLeft, point.tip]),
    fill: "#4527C9",
  },
  {
    name: "pavilion middle",
    d: polygon([point.tableBottomLeft, point.tableBottomRight, point.tip]),
    fill: "#6342F5",
  },
  {
    name: "pavilion right",
    d: polygon([point.tableBottomRight, point.girdleRight, point.tip]),
    fill: "#836DFD",
  },
] as const;

/** All facet edges as one path, for the one-colour mark's cut seams. */
export const gemSeams = gemFacets.map((f) => f.d).join("");

/** Four-point sparkle with concave sides, centred on (cx, cy). */
export function sparklePath(cx: number, cy: number, r: number): string {
  const k = r * 0.19;
  const p = (x: number, y: number) => `${round(x)},${round(y)}`;
  return [
    `M${p(cx, cy - r)}`,
    `Q${p(cx + k, cy - k)} ${p(cx + r, cy)}`,
    `Q${p(cx + k, cy + k)} ${p(cx, cy + r)}`,
    `Q${p(cx - k, cy + k)} ${p(cx - r, cy)}`,
    `Q${p(cx - k, cy - k)} ${p(cx, cy - r)}Z`,
  ].join("");
}

/** Where the sparkle sits: on the gem's top-right corner, like a badge. */
export const sparkle = { cx: 99, cy: 4, r: 27 } as const;

export const sparkleOutline = sparklePath(sparkle.cx, sparkle.cy, sparkle.r);

/**
 * The gap cut out of the gem around the sparkle, as a stroke width (twice
 * the gap), so the sparkle reads on any background.
 */
export const sparkleGapStroke = 8;

/** The whole mark's bounds, sparkle included. */
export const markBox = {
  x: 0,
  y: sparkle.cy - sparkle.r,
  width: Math.max(120, sparkle.cx + sparkle.r),
  height: 100 - (sparkle.cy - sparkle.r),
} as const;

/** The gem alone, for centring it in an app tile. */
export const gemBox = { width: 120, height: 100 } as const;
