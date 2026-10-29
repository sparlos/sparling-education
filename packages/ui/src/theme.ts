import {
  type CSSVariablesResolver,
  createTheme,
  type MantineColorsTuple,
  rem,
} from "@mantine/core";
import {
  breakpoint,
  color,
  contentWidth,
  font,
  fontSize,
  headingSize,
  lineHeight,
  motion,
  palette,
  press,
  radius,
  shadow,
  space,
  type ToneTokens,
} from "@repo/tokens";
import classes from "./theme.module.css";

/**
 * CSS custom properties the app must set (via next/font or @font-face) to the
 * loaded font families. Unset, the stacks fall back to system fonts.
 */
export const fontVariables = {
  heading: "--k-font-heading",
  body: "--k-font-body",
} as const;

const headingStack = `var(${fontVariables.heading}, "${font.heading.family}"), ${font.heading.fallback}`;
const bodyStack = `var(${fontVariables.body}, "${font.body.family}"), ${font.body.fallback}`;

// Fluid type: scale linearly from `min` at 375px to `max` at 1200px wide.
function fluid(min: number, max: number): string {
  const slope = (max - min) / (1200 - 375);
  const intercept = min - slope * 375;
  return `clamp(${rem(min)}, ${rem(intercept)} + ${(slope * 100).toFixed(3)}vw, ${rem(max)})`;
}

function headingStyle(size: { min?: number; max: number; lineHeight: number }) {
  return {
    fontSize: size.min ? fluid(size.min, size.max) : rem(size.max),
    lineHeight: String(size.lineHeight),
  };
}

function mapValues<K extends string>(
  values: Record<K, number>,
  map: (value: number) => string,
): Record<K, string> {
  return Object.fromEntries(
    Object.entries<number>(values).map(([key, value]) => [key, map(value)]),
  ) as Record<K, string>;
}

const remScale = <K extends string>(values: Record<K, number>) =>
  mapValues(values, rem);
const em = (value: number) => `${value / 16}em`;

export const theme = createTheme({
  colors: {
    ...(palette as unknown as Record<string, MantineColorsTuple>),
    // Mantine draws borders and muted UI from `gray`; tint it toward ink.
    gray: palette.ink,
  },
  primaryColor: "ember",
  primaryShade: 7,
  autoContrast: true,
  white: "#FFFFFF",
  black: color.ink.default,
  fontFamily: bodyStack,
  headings: {
    fontFamily: headingStack,
    fontWeight: String(font.heading.weight.extraBold),
    textWrap: "balance",
    sizes: {
      h1: headingStyle(headingSize.h1),
      h2: headingStyle(headingSize.h2),
      h3: { ...headingStyle(headingSize.h3), fontWeight: "800" },
      h4: { ...headingStyle(headingSize.h4), fontWeight: "700" },
      h5: { ...headingStyle(headingSize.h5), fontWeight: "700" },
      h6: { ...headingStyle(headingSize.h6), fontWeight: "700" },
    },
  },
  fontSizes: remScale(fontSize),
  lineHeights: {
    xs: String(lineHeight.snug),
    sm: String(lineHeight.normal),
    md: String(lineHeight.normal),
    lg: String(lineHeight.normal),
    xl: String(lineHeight.snug),
  },
  radius: remScale({
    xs: radius.xs,
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
  }),
  defaultRadius: "md",
  spacing: remScale({
    xs: space.xs,
    sm: space.sm,
    md: space.md,
    lg: space.lg,
    xl: space.xl,
  }),
  shadows: { ...shadow },
  breakpoints: mapValues(breakpoint, em),
  respectReducedMotion: true,
  cursorType: "pointer",
  focusClassName: classes.focus,
  components: {
    Container: {
      defaultProps: { size: rem(contentWidth.page) },
    },
    Title: {
      defaultProps: { c: color.ink.default },
    },
    Card: {
      defaultProps: { radius: "lg", padding: "xl", withBorder: true },
    },
    Badge: {
      defaultProps: { radius: "xl", size: "lg", variant: "light" },
    },
    TextInput: {
      defaultProps: { size: "md", radius: "md" },
    },
    Select: {
      defaultProps: { size: "md", radius: "md" },
    },
  },
});

function toneVariables(name: string, tone: ToneTokens) {
  return {
    [`--k-${name}-fill`]: tone.fill,
    [`--k-${name}-fill-hover`]: tone.fillHover,
    [`--k-${name}-on-fill`]: tone.onFill,
    [`--k-${name}-edge`]: tone.edge,
    [`--k-${name}-soft`]: tone.soft,
    [`--k-${name}-text`]: tone.text,
  };
}

/**
 * Publishes the semantic tokens as `--k-*` CSS variables so component CSS
 * modules can use them. The site is light-only, so `dark` mirrors `light`.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => {
  const light = {
    "--mantine-color-body": color.surface.page,
    "--mantine-color-text": color.ink.default,
    "--mantine-color-dimmed": color.ink.muted,
    "--mantine-color-default-border": color.border.default,
    "--mantine-color-placeholder": palette.ink[5],
    "--mantine-color-anchor": color.brand.text,
    "--k-surface-page": color.surface.page,
    "--k-surface-raised": color.surface.raised,
    "--k-surface-sunken": color.surface.sunken,
    "--k-surface-inverse": color.surface.inverse,
    "--k-ink": color.ink.default,
    "--k-ink-muted": color.ink.muted,
    "--k-ink-inverse": color.ink.inverse,
    "--k-ink-inverse-muted": color.ink.inverseMuted,
    "--k-border-subtle": color.border.subtle,
    "--k-border": color.border.default,
    "--k-border-strong": color.border.strong,
    "--k-focus": color.focus,
    "--k-scrim": color.scrim,
    "--k-success": color.status.success,
    "--k-success-soft": color.status.successSoft,
    "--k-info": color.status.info,
    "--k-info-soft": color.status.infoSoft,
    ...toneVariables("brand", color.brand),
    ...toneVariables("neutral", color.neutral),
    ...toneVariables("educator", color.audience.educator),
    ...toneVariables("parent", color.audience.parent),
    ...toneVariables("student", color.audience.student),
  };
  return {
    variables: {
      "--k-font-heading-stack": headingStack,
      "--k-font-body-stack": bodyStack,
      "--k-font-size-display": fluid(
        headingSize.display.min,
        headingSize.display.max,
      ),
      "--k-line-height-display": String(headingSize.display.lineHeight),
      "--k-space-section": rem(space.section),
      "--k-space-section-compact": rem(space.sectionCompact),
      "--k-width-prose": rem(contentWidth.prose),
      "--k-press-border": rem(press.borderWidth),
      "--k-press-rest": rem(press.offset.rest),
      "--k-press-hover": rem(press.offset.hover),
      "--k-press-active": rem(press.offset.active),
      "--k-duration-fast": `${motion.duration.fast}ms`,
      "--k-duration-base": `${motion.duration.base}ms`,
      "--k-duration-slow": `${motion.duration.slow}ms`,
      "--k-ease-standard": motion.easing.standard,
      "--k-ease-springy": motion.easing.springy,
    },
    light,
    dark: light,
  };
};
