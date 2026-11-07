// The brand in video: the site's tokens (lavender paper, indigo ink, violet,
// Plus Jakarta Sans), its 3D "press" edge, and the Kestrel logo. Every scene
// builds on these, so every video carries the brand.

import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadLogoFont } from "@remotion/google-fonts/Poppins";
import { color, font, palette, press } from "@repo/tokens";
import {
  logoLayout,
  markBox,
  markGoldRun,
  markParts,
  markSpine,
  type Placed,
} from "@repo/tokens/mark";
import { bylineOutline, nameOutline } from "@repo/tokens/wordmark";
import { type CSSProperties, useId } from "react";
import type { Tone } from "./brief.ts";

const family = loadFont("normal", {
  weights: ["500", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

const logoFamily = loadLogoFont("normal", {
  weights: ["800"],
  subsets: ["latin"],
}).fontFamily;

export const fonts = {
  heading: `${family}, ${font.heading.fallback}`,
  body: `${family}, ${font.body.fallback}`,
  /** The logo's typeface, for animating the name letter by letter. */
  logo: `${logoFamily}, ${font.heading.fallback}`,
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

/** The mark: gold wings over an open book, `size` px wide. */
export function Mark({ size, inverse }: { size: number; inverse?: boolean }) {
  const id = useId();
  const book = inverse ? color.logo.bookOnDark : color.logo.book;
  return (
    <svg
      width={size}
      height={(size * markBox.height) / markBox.width}
      viewBox={`0 0 ${markBox.width} ${markBox.height}`}
      aria-hidden="true"
    >
      <MarkShapes id={id} book={book} />
    </svg>
  );
}

function MarkShapes({ id, book }: { id: string; book: string }) {
  return (
    <>
      <defs>
        <linearGradient
          id={`${id}-gold`}
          gradientUnits="userSpaceOnUse"
          x1={markGoldRun.x1}
          y1={markGoldRun.y1}
          x2={markGoldRun.x2}
          y2={markGoldRun.y2}
        >
          <stop offset="0" stopColor={color.logo.goldLight} />
          <stop offset="1" stopColor={color.logo.gold} />
        </linearGradient>
        <clipPath id={`${id}-left`}>
          <rect
            x="-40"
            y="-40"
            width={markSpine.leftEdge + 40}
            height={markBox.height + 80}
          />
        </clipPath>
        <clipPath id={`${id}-right`}>
          <rect
            x={markSpine.rightEdge}
            y="-40"
            width={markBox.width - markSpine.rightEdge + 40}
            height={markBox.height + 80}
          />
        </clipPath>
      </defs>
      {markParts.map((part) => (
        <path
          key={part.d.slice(0, 32)}
          d={part.d}
          fill={part.colour === "gold" ? `url(#${id}-gold)` : book}
          clipPath={part.side ? `url(#${id}-${part.side})` : undefined}
        />
      ))}
    </>
  );
}

const at = (p: Placed) => `translate(${p.x} ${p.y}) scale(${p.scale})`;

/** The logo as on the site's header: the mark beside the name, `size` px tall. */
export function Wordmark({
  size,
  inverse,
  byline,
}: {
  /** Height of the logo, in px (the mark's height). */
  size: number;
  inverse?: boolean;
  /** Adds "by Sparling Education" under the name. */
  byline?: boolean;
}) {
  const id = useId();
  const layout = logoLayout(
    { name: nameOutline, byline: bylineOutline },
    "horizontal",
    Boolean(byline),
  );
  return (
    <svg
      height={size}
      width={(size * layout.width) / layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      <g transform={at(layout.mark)}>
        <MarkShapes
          id={id}
          book={inverse ? color.logo.bookOnDark : color.logo.book}
        />
      </g>
      <path
        transform={at(layout.name)}
        d={nameOutline.d}
        fill={inverse ? color.ink.inverse : color.ink.default}
      />
      {layout.byline && (
        <path
          transform={at(layout.byline)}
          d={bylineOutline.d}
          fill={inverse ? color.logo.bylineOnDark : color.logo.byline}
        />
      )}
    </svg>
  );
}
