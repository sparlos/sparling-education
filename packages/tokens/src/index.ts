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
  /** Brand vermilion. */
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
  /** Warm charcoal used for text and UI chrome. */
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
  /** Warm paper neutrals for page surfaces. */
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
  /** Student accent. */
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
  /** Educator accent (deep green; the key is kept to avoid renaming churn). */
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
  /** Parent accent (muted purple; the key is kept to avoid renaming churn). */
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

const { ember, ink, sand, sunshine, teal, berry, leaf, sky } = palette;

export const color = {
  surface: {
    /** Page background. */
    page: sand[1],
    /** Cards and other raised areas. */
    raised: "#FFFFFF",
    /** Recessed bands that separate page sections. */
    sunken: sand[2],
    /** Dark band, e.g. the footer. */
    inverse: ink[9],
  },
  ink: {
    /** Headings and body text. */
    default: ink[9],
    /** Secondary text. */
    muted: ink[6],
    /** Text on `surface.inverse`. */
    inverse: sand[0],
    /** Secondary text on `surface.inverse`. */
    inverseMuted: ink[2],
  },
  border: {
    subtle: sand[3],
    default: ink[2],
    strong: ink[7],
  },
  /** Keyboard focus ring; meets 3:1 against every surface. */
  focus: sky[6],
  brand: {
    fill: ember[7],
    fillHover: ember[8],
    onFill: "#FFFFFF",
    edge: ember[9],
    soft: ember[0],
    text: ember[8],
  },
  /** White, ink-edged secondary tone. */
  neutral: {
    fill: "#FFFFFF",
    fillHover: sand[0],
    onFill: ink[9],
    edge: ink[9],
    soft: sand[2],
    text: ink[9],
  },
  audience: {
    educator: {
      fill: teal[7],
      fillHover: teal[8],
      onFill: "#FFFFFF",
      edge: teal[9],
      soft: teal[0],
      text: teal[7],
    },
    parent: {
      fill: berry[6],
      fillHover: berry[7],
      onFill: "#FFFFFF",
      edge: berry[8],
      soft: berry[0],
      text: berry[7],
    },
    student: {
      fill: sunshine[4],
      fillHover: sunshine[3],
      onFill: ink[9],
      edge: sunshine[8],
      soft: sunshine[0],
      text: sunshine[8],
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
} & Record<string, unknown>;

export type Audience = keyof typeof color.audience;

export const font = {
  heading: {
    family: "Nunito",
    fallback: "ui-rounded, system-ui, -apple-system, 'Segoe UI', sans-serif",
    weight: { bold: 700, extraBold: 800 },
  },
  body: {
    family: "Nunito Sans",
    fallback: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    weight: { regular: 400, semiBold: 600, bold: 700 },
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

/** Corner radius in px. */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  round: 9999,
} as const;

/** Soft shadows, tinted toward ink rather than grey. */
export const shadow = {
  xs: "0 1px 2px rgba(31, 31, 31,0.06)",
  sm: "0 1px 2px rgba(31, 31, 31,0.06), 0 2px 6px rgba(31, 31, 31,0.06)",
  md: "0 2px 4px rgba(31, 31, 31,0.05), 0 8px 20px rgba(31, 31, 31,0.08)",
  lg: "0 4px 8px rgba(31, 31, 31,0.05), 0 16px 40px rgba(31, 31, 31,0.10)",
  xl: "0 8px 16px rgba(31, 31, 31,0.06), 0 28px 64px rgba(31, 31, 31,0.14)",
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
