// Kindling design tokens: the single source of truth for colour, type,
// spacing, shape and motion. Plain values only, so the marketing site
// (via the Mantine theme in @repo/ui) and the game (PlayCanvas) share them.
//
// Pixel values are numbers; consumers convert to rem or world units.

export const brandName = "Kindling";

/** A 10-step scale, 0 = lightest, 9 = darkest. */
export type Scale = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export const palette = {
  /** Vermilion, for game art. */
  ember: [
    "#FDEDE8",
    "#FBD9CF",
    "#F7B7A5",
    "#F28F78",
    "#EC694D",
    "#E4492C",
    "#E04126",
    "#D9381E",
    "#B82D16",
    "#7A1A0A",
  ],
  /** Warm charcoal, for game art. */
  ink: [
    "#F5F3EF",
    "#E6E1D8",
    "#CFC8BC",
    "#ADA69A",
    "#8A8479",
    "#6E6962",
    "#5C5750",
    "#4A463F",
    "#33312D",
    "#1F1F1F",
  ],
  /** Warm paper neutrals, for game art. */
  sand: [
    "#FFFDF9",
    "#FAF7F2",
    "#F0EBE1",
    "#E6DFD2",
    "#D6CCBA",
    "#BFB29B",
    "#9F9279",
    "#7C705A",
    "#574E3F",
    "#3A342B",
  ],
  /** Sunny yellow, for game art. */
  sunshine: [
    "#FEF6E0",
    "#FCEBB8",
    "#F9DB85",
    "#F5C458",
    "#F2B632",
    "#DDA01A",
    "#BC8212",
    "#9A6A10",
    "#7A5710",
    "#5A3F08",
  ],
  /** Deep green, for game art (the key is kept to avoid renaming churn). */
  teal: [
    "#E8F1ED",
    "#CDE3DA",
    "#A3CBBB",
    "#78AF9B",
    "#538F7A",
    "#3E7662",
    "#346A58",
    "#2E5E4E",
    "#244B3E",
    "#142B23",
  ],
  /** Muted purple, for game art (the key is kept to avoid renaming churn). */
  berry: [
    "#EFECF7",
    "#DDD7EE",
    "#C0B7DE",
    "#A094CB",
    "#8274B5",
    "#6C5DA0",
    "#5B4B8A",
    "#493B70",
    "#2B2250",
    "#1E1738",
  ],
  /** Success and growth. */
  leaf: [
    "#EEF8EC",
    "#D5EFD1",
    "#ABDFA4",
    "#7DCB73",
    "#57B74B",
    "#3E9F33",
    "#2F8527",
    "#256B1F",
    "#1D5419",
    "#153D12",
  ],
  /** Information and focus. */
  sky: [
    "#EAF5FD",
    "#CCE7FA",
    "#9BD0F4",
    "#66B6EC",
    "#3D9DE1",
    "#2485CB",
    "#1A6EAD",
    "#16598C",
    "#13466D",
    "#0E334F",
  ],
  /** Cool neutrals for page surfaces, text and UI chrome. */
  slate: [
    "#F4F5FA",
    "#ECEEF5",
    "#D7DAE6",
    "#B4B8CA",
    "#8E92A8",
    "#73778F",
    "#60647E",
    "#4B4F6B",
    "#33364F",
    "#1B1D33",
  ],
  /** Brand teal. */
  jade: [
    "#E3F4EF",
    "#C4E9DE",
    "#A0DBCA",
    "#7CCBB6",
    "#4DB39B",
    "#23977F",
    "#0E7C6B",
    "#0B6A5C",
    "#0B5E51",
    "#073F37",
  ],
} as const satisfies Record<string, Scale>;

export type PaletteName = keyof typeof palette;

/** A colour family as used by filled, 3D-pressable elements. */
export interface ToneTokens {
  /** Solid fill (buttons, chips). */
  fill: string;
  /** Fill on hover. */
  fillHover: string;
  /** Text and icons placed on `fill`. */
  onFill: string;
  /** The darker "edge" under a 3D-pressable element (border + offset shadow). */
  edge: string;
  /** Pale tint for backgrounds behind accent content. */
  soft: string;
  /** Accent-coloured text on page surfaces. */
  text: string;
}

const { leaf, sky, slate, jade } = palette;

/** One step of a results ramp: a cell's fill, and the text on it. */
export interface ResultStep {
  fill: string;
  text: string;
}

/**
 * A colour a teacher can pick for a class. Every screen for the class takes
 * its hue from it; colours that carry meaning (misconceptions, recognition,
 * focus, status) never do.
 */
export interface ClassColour {
  /** Stable: stored on the class. Never rename one. */
  slug: string;
  /** What teachers see and hear it called. */
  name: string;
  tone: ToneTokens;
  /**
   * The results grid's understanding bands, weakest to strongest. The steps
   * differ clearly in lightness, so they're told apart without seeing hue.
   */
  results: { weak: ResultStep; middle: ResultStep; strong: ResultStep };
}

/** A class colour from its hexes, light hues taking dark text on their fill. */
function defineClassColour<Slug extends string>(
  slug: Slug,
  name: string,
  [fill, fillHover, edge, soft, text, weak, middle, strong]: readonly string[],
  onFill: string = "#FFFFFF",
): ClassColour & { slug: Slug } {
  const hex = (value: string | undefined) => {
    if (!value) throw new Error(`Class colour ${slug} is missing a hex`);
    return value;
  };
  return {
    slug,
    name,
    tone: {
      fill: hex(fill),
      fillHover: hex(fillHover),
      onFill,
      edge: hex(edge),
      soft: hex(soft),
      text: hex(text),
    },
    results: {
      weak: { fill: hex(weak), text: hex(text) },
      middle: { fill: hex(middle), text: slate[9] },
      strong: { fill: hex(strong), text: "#FFFFFF" },
    },
  };
}

/**
 * The class colours, in the order they're offered and given out by default.
 * Add up to 16 at the end; never reorder or remove one, since classes store
 * the slug. Hexes are: fill, fill hover, edge, soft, text, then the results
 * ramp's weak, middle and strong fills.
 */
export const classColours = [
  defineClassColour("teal", "Teal", [
    jade[6],
    jade[7],
    "#0A5247",
    jade[0],
    jade[8],
    jade[0],
    jade[3],
    jade[8],
  ]),
  defineClassColour("green", "Green", [
    "#017D38",
    "#00682D",
    "#015725",
    "#E4F7E7",
    "#0B682F",
    "#DBF5E0",
    "#82C891",
    "#036029",
  ]),
  defineClassColour(
    "lime",
    "Lime",
    [
      "#9CC959",
      "#8FBC4B",
      "#385202",
      "#EBF6E0",
      "#446303",
      "#E6F4D7",
      "#A2C279",
      "#3E5A01",
    ],
    slate[9],
  ),
  defineClassColour(
    "amber",
    "Amber",
    [
      "#F1AF36",
      "#E3A220",
      "#654401",
      "#FEF1DD",
      "#775204",
      "#FEECD2",
      "#DEB169",
      "#6F4B00",
    ],
    slate[9],
  ),
  defineClassColour("orange", "Orange", [
    "#B05100",
    "#914203",
    "#7B3803",
    "#FFF0E7",
    "#90440B",
    "#FEEBE0",
    "#F2A77D",
    "#873D03",
  ]),
  defineClassColour("coral", "Coral", [
    "#C13E2F",
    "#A23125",
    "#882B1F",
    "#FFEFEC",
    "#953E32",
    "#FEEAE7",
    "#F8A294",
    "#8D372B",
  ]),
  defineClassColour("rose", "Rose", [
    "#BF3A5F",
    "#A02F4E",
    "#872742",
    "#FFEFF1",
    "#933B50",
    "#FEEAED",
    "#F7A0AF",
    "#8B344A",
  ]),
  defineClassColour("berry", "Berry", [
    "#B43F89",
    "#963372",
    "#7E2B60",
    "#FEEFF7",
    "#8B3D6D",
    "#FFE9F4",
    "#EDA1CC",
    "#833766",
  ]),
  defineClassColour("violet", "Violet", [
    "#8253C4",
    "#6C43A4",
    "#5B3A8A",
    "#F5F1FE",
    "#674A95",
    "#F2ECFF",
    "#C6ACF5",
    "#61438D",
  ]),
  defineClassColour("indigo", "Indigo", [
    "#5C5FD0",
    "#4B4EAE",
    "#3F4192",
    "#EFF2FF",
    "#4D519D",
    "#EBEEFE",
    "#AAB4FD",
    "#464B95",
  ]),
  defineClassColour("blue", "Blue", [
    "#2269CD",
    "#1957AC",
    "#164A91",
    "#EBF3FF",
    "#2B589B",
    "#E6F0FE",
    "#8EBBFC",
    "#245294",
  ]),
  defineClassColour("sky", "Sky", [
    "#06749D",
    "#045F82",
    "#02506E",
    "#E4F5FE",
    "#045F82",
    "#DDF2FE",
    "#6BC2EE",
    "#025879",
  ]),
] as const satisfies readonly ClassColour[];

export type ClassColourSlug = (typeof classColours)[number]["slug"];

/** The class colour screens outside any class, and new classes, fall back to. */
export const defaultClassColour: ClassColourSlug = "teal";

/** The class colour with this slug, or the default for one Kindling doesn't have. */
export function classColour(slug: string): ClassColour {
  return (
    classColours.find((c) => c.slug === slug) ??
    (classColours[0] as ClassColour)
  );
}

export function isClassColour(slug: string): slug is ClassColourSlug {
  return classColours.some((c) => c.slug === slug);
}

/**
 * The colour a new class gets by default: the first, in the set's order,
 * that none of the teacher's other classes has. Once all are used, they're
 * given out again in turn.
 */
export function nextClassColour(used: readonly string[]): ClassColourSlug {
  const unused = classColours.find((c) => !used.includes(c.slug));
  if (unused) return unused.slug;
  const known = used.filter(isClassColour);
  return classColours[known.length % classColours.length]?.slug ?? "teal";
}

/**
 * The tints of students' initial circles: a soft fill and the initial on it.
 * Picked per student by `initialTint`, so a student keeps theirs on every
 * screen. Never a class or result colour.
 */
export const initialTints = [
  { fill: "#FDE68A", text: slate[9] },
  { fill: "#BFDBFE", text: slate[9] },
  { fill: "#FBCFE8", text: slate[9] },
  { fill: "#BBF7D0", text: slate[9] },
  { fill: "#DDD6FE", text: slate[9] },
  { fill: "#FED7AA", text: slate[9] },
] as const satisfies readonly ResultStep[];

/** A student's initial-circle tint, from a stable hash of their ID. */
export function initialTint(id: string): (typeof initialTints)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return initialTints[hash % initialTints.length] ?? initialTints[0];
}

const teal = classColour("teal").tone;

export const color = {
  surface: {
    /** Page background. */
    page: slate[0],
    /** Cards and other raised areas. */
    raised: "#FFFFFF",
    /** Recessed areas, e.g. a pale band or a cell with nothing in it. */
    sunken: slate[1],
    /** Dark band, e.g. the footer. */
    inverse: slate[9],
  },
  ink: {
    /** Headings and body text. */
    default: slate[9],
    /** Secondary text. */
    muted: slate[7],
    /** Text on `surface.inverse`. */
    inverse: slate[0],
    /** Secondary text on `surface.inverse`. */
    inverseMuted: slate[3],
  },
  border: {
    /** Hairlines between rows. */
    subtle: slate[1],
    /** Input borders. */
    default: slate[2],
    strong: slate[6],
  },
  /** Keyboard focus ring; meets 3:1 against every surface. */
  focus: "#1E40AF",
  /**
   * The light gap between the ring and what has focus (it's drawn offset),
   * so it shows beside every fill too.
   */
  focusHalo: "#FFFFFF",
  /** Dims the page behind something that needs the eye, like a walkthrough's spotlight. */
  scrim: "rgba(27, 29, 51, 0.6)",
  /** Kindling's own colour: teal, the first class colour. */
  brand: teal,
  /** White, ink-edged secondary tone. */
  neutral: {
    fill: "#FFFFFF",
    fillHover: slate[0],
    onFill: slate[9],
    edge: slate[9],
    soft: slate[1],
    text: slate[9],
  },
  audience: {
    educator: teal,
    parent: classColour("violet").tone,
    student: classColour("amber").tone,
  },
  /** Fixed meanings, the same in every class. */
  meaning: {
    /** Misconception counts. */
    misconception: {
      fill: "#F1AF36",
      fillHover: "#E3A220",
      onFill: slate[9],
      edge: "#654401",
      soft: "#FFF1D6",
      text: "#7A4A00",
    },
    /** Recognition, and the stickers it gives. */
    recognition: {
      fill: "#C2307A",
      fillHover: "#A3266A",
      onFill: "#FFFFFF",
      edge: "#8A1F59",
      soft: "#FDE7F1",
      text: "#A0255F",
    },
  },
  status: {
    success: leaf[7],
    successSoft: leaf[0],
    info: sky[6],
    infoSoft: sky[0],
  },
} as const satisfies {
  brand: ToneTokens;
  neutral: ToneTokens;
  audience: Record<string, ToneTokens>;
  meaning: Record<string, ToneTokens>;
} & Record<string, unknown>;

export type Audience = keyof typeof color.audience;
export type Meaning = keyof typeof color.meaning;

/**
 * One family for headings and body, self-hosted in three weights (500, 700,
 * 800) to keep the play shell light.
 */
export const font = {
  heading: {
    family: "Plus Jakarta Sans",
    fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    weight: { bold: 700, extraBold: 800 },
  },
  body: {
    family: "Plus Jakarta Sans",
    fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    weight: { regular: 500, semiBold: 700, bold: 700 },
  },
} as const;

/** Body sizes in px. */
export const fontSize = {
  xs: 13,
  sm: 15,
  md: 17,
  lg: 19,
  xl: 22,
} as const;

export const lineHeight = {
  tight: 1.1,
  snug: 1.3,
  normal: 1.6,
} as const;

/**
 * Heading sizes in px. `min` applies on small screens and scales fluidly up to
 * `max`; headings without a `min` are fixed.
 */
export const headingSize = {
  display: { min: 40, max: 68, lineHeight: 1.05 },
  h1: { min: 36, max: 56, lineHeight: 1.08 },
  h2: { min: 30, max: 42, lineHeight: 1.15 },
  h3: { max: 26, lineHeight: 1.25 },
  h4: { max: 21, lineHeight: 1.3 },
  h5: { max: 18, lineHeight: 1.35 },
  h6: { max: 16, lineHeight: 1.4 },
} as const;

/** Spacing in px. `section` sizes separate page sections. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 96,
  sectionCompact: 64,
} as const;

/** Corner radius in px. `card` is a teacher card; the locker's use `lg`. */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  xl: 28,
  round: 9999,
} as const;

/** Soft shadows, tinted toward ink rather than grey. `card` lifts cards off the page, with no border. */
export const shadow = {
  xs: "0 1px 2px rgba(27, 29, 51, 0.06)",
  sm: "0 1px 2px rgba(27, 29, 51, 0.06), 0 2px 6px rgba(27, 29, 51, 0.06)",
  card: "0 1px 2px rgba(27, 29, 51, 0.06), 0 8px 24px rgba(27, 29, 51, 0.06)",
  md: "0 2px 4px rgba(27, 29, 51, 0.05), 0 8px 20px rgba(27, 29, 51, 0.08)",
  lg: "0 4px 8px rgba(27, 29, 51, 0.05), 0 16px 40px rgba(27, 29, 51, 0.10)",
  xl: "0 8px 16px rgba(27, 29, 51, 0.06), 0 28px 64px rgba(27, 29, 51, 0.14)",
} as const;

/**
 * The 3D "press" effect: a solid edge offset down-right. At rest the element
 * sits `rest` px above its edge, lifts to `hover`, and sinks to `active`.
 */
export const press = {
  borderWidth: 2,
  offset: { rest: 4, hover: 6, active: 0 },
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    /** Slight overshoot for playful lifts. */
    springy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  /** Physics springs for JS animation; `bouncy` overshoots noticeably. */
  spring: {
    gentle: { stiffness: 220, damping: 26 },
    bouncy: { stiffness: 420, damping: 15 },
  },
  /** Scroll-in entrances: rise distance (px) and gap between siblings (ms). */
  reveal: { distance: 28, stagger: 70 },
} as const;

/** Breakpoints in px. */
export const breakpoint = {
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1408,
} as const;

export type Breakpoint = keyof typeof breakpoint;

/**
 * CSS custom media queries derived from `breakpoint`, for
 * `@media (--k-md-down) { … }` in CSS modules. `-up` starts at the
 * breakpoint; `-down` ends 0.1px before it, matching Mantine's hiddenFrom.
 */
export const customMedia = Object.fromEntries(
  (Object.entries(breakpoint) as [Breakpoint, number][]).flatMap(
    ([name, px]) => [
      [`--k-${name}-up`, `(min-width: ${px / 16}em)`],
      [`--k-${name}-down`, `(max-width: ${(px - 0.1) / 16}em)`],
    ],
  ),
) as Record<`--k-${Breakpoint}-${"up" | "down"}`, string>;

/** Max content widths in px. */
export const contentWidth = {
  prose: 680,
  page: 1200,
} as const;
