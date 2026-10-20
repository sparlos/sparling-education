// TEMPORARY: colour-scheme experiments. Each variant overrides the `--k-*`
// variables at runtime; "current" overrides nothing. Delete along with
// palette-debug.tsx once a scheme is chosen and moved into @repo/tokens.

type Vars = Record<string, string>;

function tone(
  name: string,
  t: {
    fill: string;
    hover: string;
    onFill: string;
    edge: string;
    soft: string;
    text: string;
  },
): Vars {
  return {
    [`--k-${name}-fill`]: t.fill,
    [`--k-${name}-fill-hover`]: t.hover,
    [`--k-${name}-on-fill`]: t.onFill,
    [`--k-${name}-edge`]: t.edge,
    [`--k-${name}-soft`]: t.soft,
    [`--k-${name}-text`]: t.text,
  };
}

function base(v: {
  page: string;
  raised: string;
  sunken: string;
  inverse: string;
  ink: string;
  muted: string;
  inverseInk: string;
  inverseMuted: string;
  borderSubtle: string;
  border: string;
  borderStrong: string;
  focus: string;
}): Vars {
  return {
    "--mantine-color-body": v.page,
    "--mantine-color-text": v.ink,
    "--mantine-color-dimmed": v.muted,
    "--mantine-color-default-border": v.border,
    "--k-surface-page": v.page,
    "--k-surface-raised": v.raised,
    "--k-surface-sunken": v.sunken,
    "--k-surface-inverse": v.inverse,
    "--k-ink": v.ink,
    "--k-ink-muted": v.muted,
    "--k-ink-inverse": v.inverseInk,
    "--k-ink-inverse-muted": v.inverseMuted,
    "--k-border-subtle": v.borderSubtle,
    "--k-border": v.border,
    "--k-border-strong": v.borderStrong,
    "--k-focus": v.focus,
    "--k-neutral-edge": v.ink,
    "--k-neutral-on-fill": v.ink,
    "--k-neutral-text": v.ink,
  };
}

export const paletteVariants: Record<string, Vars> = {
  current: {},

  // Cool, calm, "tech-forward" learning app: indigo brand on a lavender wash.
  "Indigo & Coral": {
    ...base({
      page: "#F7F7FD",
      raised: "#FFFFFF",
      sunken: "#ECECFA",
      inverse: "#1E1B4B",
      ink: "#1E1B4B",
      muted: "#4B4A7A",
      inverseInk: "#F7F7FD",
      inverseMuted: "#C7C6EA",
      borderSubtle: "#DEDDF3",
      border: "#C4C3E6",
      borderStrong: "#4B4A7A",
      focus: "#2563EB",
    }),
    "--mantine-color-anchor": "#4338CA",
    ...tone("brand", {
      fill: "#4F46E5",
      hover: "#4338CA",
      onFill: "#FFFFFF",
      edge: "#312E81",
      soft: "#EEF0FF",
      text: "#4338CA",
    }),
    ...tone("student", {
      fill: "#FF7A66",
      hover: "#FF9080",
      onFill: "#1E1B4B",
      edge: "#B83A28",
      soft: "#FFF0ED",
      text: "#B83A28",
    }),
    ...tone("educator", {
      fill: "#0E7C86",
      hover: "#0B666E",
      onFill: "#FFFFFF",
      edge: "#094A50",
      soft: "#E6F6F7",
      text: "#0E7C86",
    }),
    ...tone("parent", {
      fill: "#B4469B",
      hover: "#9A3883",
      onFill: "#FFFFFF",
      edge: "#6E2260",
      soft: "#FBEDF8",
      text: "#9A3883",
    }),
  },

  // Natural and grounded: deep forest green with warm apricot.
  "Forest & Apricot": {
    ...base({
      page: "#F6F8F2",
      raised: "#FFFFFF",
      sunken: "#E8EFE0",
      inverse: "#14301F",
      ink: "#14301F",
      muted: "#42604C",
      inverseInk: "#F6F8F2",
      inverseMuted: "#BCD2C2",
      borderSubtle: "#D8E3CC",
      border: "#B5C9B9",
      borderStrong: "#42604C",
      focus: "#1A6EAD",
    }),
    "--mantine-color-anchor": "#1F6B3A",
    ...tone("brand", {
      fill: "#1F7A45",
      hover: "#18633A",
      onFill: "#FFFFFF",
      edge: "#0E3F22",
      soft: "#E8F5EC",
      text: "#1F6B3A",
    }),
    ...tone("student", {
      fill: "#FFB26B",
      hover: "#FFC08A",
      onFill: "#14301F",
      edge: "#A85A12",
      soft: "#FFF3E6",
      text: "#97500F",
    }),
    ...tone("educator", {
      fill: "#2F6FA8",
      hover: "#265A89",
      onFill: "#FFFFFF",
      edge: "#173A5A",
      soft: "#E8F1F9",
      text: "#2F6FA8",
    }),
    ...tone("parent", {
      fill: "#B8514A",
      hover: "#9C423C",
      onFill: "#FFFFFF",
      edge: "#6A2420",
      soft: "#FBEEED",
      text: "#9C423C",
    }),
  },

  // Bold and playful: crisp white, electric violet, sunny yellow.
  "Violet & Lemon": {
    ...base({
      page: "#FFFFFF",
      raised: "#FFFFFF",
      sunken: "#F5F0FF",
      inverse: "#2A1458",
      ink: "#22123F",
      muted: "#5B4A80",
      inverseInk: "#FFFFFF",
      inverseMuted: "#D5C8F0",
      borderSubtle: "#E8DFFA",
      border: "#CFC0EE",
      borderStrong: "#22123F",
      focus: "#0070F3",
    }),
    "--mantine-color-anchor": "#6D28D9",
    ...tone("brand", {
      fill: "#7C3AED",
      hover: "#6D28D9",
      onFill: "#FFFFFF",
      edge: "#3B1585",
      soft: "#F3ECFF",
      text: "#6D28D9",
    }),
    ...tone("student", {
      fill: "#FFE14D",
      hover: "#FFE878",
      onFill: "#22123F",
      edge: "#8A6D00",
      soft: "#FFFBE0",
      text: "#7A6000",
    }),
    ...tone("educator", {
      fill: "#0891B2",
      hover: "#0E7490",
      onFill: "#FFFFFF",
      edge: "#0B4A5E",
      soft: "#E5F7FB",
      text: "#0E7490",
    }),
    ...tone("parent", {
      fill: "#DB2777",
      hover: "#BE185D",
      onFill: "#FFFFFF",
      edge: "#7A0F3C",
      soft: "#FDEBF3",
      text: "#BE185D",
    }),
  },

  // Quiet and editorial: warm paper, charcoal, one confident red-orange.
  "Paper & Vermilion": {
    ...base({
      page: "#FAF7F2",
      raised: "#FFFFFF",
      sunken: "#F0EBE1",
      inverse: "#1F1F1F",
      ink: "#1F1F1F",
      muted: "#5C5750",
      inverseInk: "#FAF7F2",
      inverseMuted: "#CFC8BC",
      borderSubtle: "#E6DFD2",
      border: "#CFC8BC",
      borderStrong: "#1F1F1F",
      focus: "#1D4ED8",
    }),
    "--mantine-color-anchor": "#C2310B",
    ...tone("brand", {
      fill: "#D9381E",
      hover: "#B82D16",
      onFill: "#FFFFFF",
      edge: "#7A1A0A",
      soft: "#FDEDE8",
      text: "#B82D16",
    }),
    ...tone("student", {
      fill: "#F2B632",
      hover: "#F5C458",
      onFill: "#1F1F1F",
      edge: "#8A6410",
      soft: "#FEF6E0",
      text: "#7A5710",
    }),
    ...tone("educator", {
      fill: "#2E5E4E",
      hover: "#244B3E",
      onFill: "#FFFFFF",
      edge: "#142B23",
      soft: "#E8F1ED",
      text: "#2E5E4E",
    }),
    ...tone("parent", {
      fill: "#5B4B8A",
      hover: "#493B70",
      onFill: "#FFFFFF",
      edge: "#2B2250",
      soft: "#EFECF7",
      text: "#5B4B8A",
    }),
  },
};
