// The brand in video: the site's tokens (lavender paper, indigo ink, violet,
// Plus Jakarta Sans), its 3D "press" edge, and the gem logo. Every scene
// builds on these, so every video carries the brand.
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import {
  brandByline,
  brandName,
  color,
  font,
  palette,
  press,
} from "@repo/tokens";
import {
  gemFacets,
  gemOutline,
  markBox,
  sparkleGapStroke,
  sparkleOutline,
} from "@repo/tokens/mark";
import { type CSSProperties, useId } from "react";
import type { Tone } from "./brief.ts";

const family = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

export const fonts = {
  heading: `${family}, ${font.heading.fallback}`,
  body: `${family}, ${font.body.fallback}`,
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

/** The gem with its sparkle, `size` px tall (sparkle included). */
export function Mark({ size }: { size: number }) {
  const id = useId();
  return (
    <svg
      height={size}
      width={(size * markBox.width) / markBox.height}
      viewBox={`${markBox.x} ${markBox.y} ${markBox.width} ${markBox.height}`}
      aria-hidden="true"
    >
      <mask
        id={`${id}-cut`}
        maskUnits="userSpaceOnUse"
        x="-10"
        y="-40"
        width="160"
        height="150"
      >
        <path d={gemOutline} fill="#fff" />
        <path
          d={sparkleOutline}
          fill="#000"
          stroke="#000"
          strokeWidth={sparkleGapStroke}
          strokeLinejoin="round"
        />
      </mask>
      <clipPath id={`${id}-clip`}>
        <path d={gemOutline} />
      </clipPath>
      <g mask={`url(#${id}-cut)`}>
        <g clipPath={`url(#${id}-clip)`}>
          {gemFacets.map((facet) => (
            <path key={facet.name} d={facet.d} fill={facet.fill} />
          ))}
        </g>
      </g>
      <path d={sparkleOutline} fill={color.sparkle} />
    </svg>
  );
}

/** The gem plus the product name, as on the site's header. */
export function Wordmark({
  size,
  inverse,
  byline,
}: {
  /** Font size of the name, in px. */
  size: number;
  inverse?: boolean;
  /** Adds "by Sparling Education" under the name. */
  byline?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: byline ? "flex-start" : "center",
        gap: size * 0.4,
        fontFamily: fonts.heading,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -size * 0.025,
        color: inverse ? color.ink.inverse : color.ink.default,
      }}
    >
      <div style={{ marginTop: -size * 0.2 }}>
        <Mark size={size * 1.12} />
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", gap: size * 0.3 }}
      >
        <span>{brandName}</span>
        {byline && (
          <span
            style={{
              fontWeight: 500,
              fontSize: size * 0.4,
              letterSpacing: size * 0.004,
              color: inverse ? color.ink.inverseMuted : color.ink.muted,
            }}
          >
            {brandByline}
          </span>
        )}
      </div>
    </div>
  );
}
