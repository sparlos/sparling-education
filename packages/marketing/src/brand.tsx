// Kindling's look in video: the site's tokens (warm sand paper, ink, ember,
// Nunito), its 3D "press" edge, and the flame wordmark. Every scene builds on
// these, so every video carries the brand.
import { loadFont as loadHeading } from "@remotion/google-fonts/Nunito";
import { loadFont as loadBody } from "@remotion/google-fonts/NunitoSans";
import { color, font, palette, press } from "@repo/tokens";
import type { CSSProperties } from "react";
import type { Tone } from "./brief.ts";

export const headingFont = loadHeading("normal", {
  weights: ["700", "800", "900"],
  subsets: ["latin"],
}).fontFamily;
export const bodyFont = loadBody("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const fonts = {
  heading: `${headingFont}, ${font.heading.fallback}`,
  body: `${bodyFont}, ${font.body.fallback}`,
};

export { color, palette };

/** A tone's colours: fill, edge, soft tint, text. */
export function toneOf(tone: Tone) {
  return tone === "brand" ? color.brand : color.audience[tone];
}

/**
 * The site's 3D press: a solid ink edge offset down-right. `scale` sizes it
 * for video (the site's 4px edge reads as hairline at 1080p).
 */
export function pressStyle(
  edge: string = color.ink.default,
  lift: number = press.offset.rest,
  scale = 2.5,
): CSSProperties {
  const o = lift * scale;
  return {
    border: `${press.borderWidth * scale}px solid ${edge}`,
    boxShadow: `${o}px ${o}px 0 ${edge}`,
  };
}

/** The flame mark from the site's wordmark. */
export function FlameMark({
  size,
  tone = "brand",
}: {
  size: number;
  tone?: Tone;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill={toneOf(tone).fill} />
      <path
        d="M16.4 6.5c.6 3.2-1.1 5-2.8 6.8-1.6 1.7-3.1 3.4-3.1 6.2 0 3.6 2.6 6 5.6 6s5.5-2.3 5.5-5.8c0-2.4-1.2-4-2.3-5.3-.2 1.6-.9 2.7-2 3.1.6-3.4.2-7.5-.9-11z"
        fill="#FFF4EC"
      />
      <path
        d="M16.1 25.5c-1.6 0-2.8-1.2-2.8-2.8 0-1.7 1.3-2.6 2.4-3.9.2 1 .8 1.6 1.6 1.8.3-.4.5-.9.5-1.4.8.9 1.2 1.9 1.2 3 0 1.9-1.3 3.3-2.9 3.3z"
        fill={color.audience.student.fill}
      />
    </svg>
  );
}

/** Flame mark plus "Kindling", as on the site's header. */
export function Wordmark({
  size,
  inverse,
}: {
  /** Cap height of the name, in px. */
  size: number;
  inverse?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.35,
        fontFamily: fonts.heading,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: -size * 0.02,
        color: inverse ? color.ink.inverse : color.ink.default,
      }}
    >
      <FlameMark size={size * 1.15} />
      <span>Kindling</span>
    </div>
  );
}
