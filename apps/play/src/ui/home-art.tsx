// Each game's picture on its card on home, by named slot (`home-card`),
// like other game art: real art registered under the same slot replaces the
// placeholder without code changes. It lives in the shell, not the game, so
// home never downloads a game's code. A game without its own is a
// tinted placeholder in its class's colour.
import { palette } from "@repo/tokens";
import type { ReactNode } from "react";
import { splashArt } from "./splash-art.ts";

/** A 240×120 frame, centred. */
interface HomeArt {
  draw(): ReactNode;
}

const stroke = palette.sunshine[8];

export const homeArt: Record<string, HomeArt> = {
  /** A quarter circle and a bar in thirds: simple fraction shapes. */
  "fraction-hop": {
    draw: () => (
      <>
        <rect width="240" height="120" fill={palette.sunshine[0]} />
        <circle
          cx="82"
          cy="60"
          r="32"
          fill="#FFFFFF"
          stroke={stroke}
          strokeWidth="3"
        />
        <path d="M82 60V28a32 32 0 0 1 32 32z" fill={palette.sunshine[4]} />
        <rect
          x="128"
          y="44"
          width="64"
          height="32"
          rx="6"
          fill="#FFFFFF"
          stroke={stroke}
          strokeWidth="3"
        />
        <rect
          x="128"
          y="44"
          width="21"
          height="32"
          rx="6"
          fill={palette.sunshine[4]}
        />
        <path d="M149 44v32M171 44v32" stroke={stroke} strokeWidth="3" />
      </>
    ),
  },
};

/**
 * The picture on a game's card on home: its splash image, else its slot's
 * art, else the placeholder.
 */
export function HomeCardPicture({ slug }: { slug: string }) {
  const splash = splashArt[slug];
  if (splash)
    return (
      // biome-ignore lint/performance/noImgElement: not a Next.js app
      <img data-slot="home-card" src={splash} alt="" draggable={false} />
    );
  const art = homeArt[slug];
  return (
    <svg
      data-slot="home-card"
      data-placeholder={art ? undefined : true}
      viewBox="0 0 240 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {art ? (
        art.draw()
      ) : (
        <>
          <rect width="240" height="120" fill="var(--k-accent-soft)" />
          <circle
            cx="120"
            cy="60"
            r="22"
            fill="var(--k-accent-fill)"
            opacity="0.3"
          />
        </>
      )}
    </svg>
  );
}

/**
 * Each game's keepsake in the locker, by named slot (`keepsake`): one fixed
 * object for each game a student has played, drawn in a 100×100 frame
 * standing on its bottom edge. Real art registered here replaces the
 * placeholder without code changes.
 */
export const keepsakeArt: Record<string, HomeArt> = {};

// A placeholder's shape, picked from the game's slug so each game keeps its own.
const keepsakeShapes = [
  // A ball
  <circle key="round" cx="50" cy="56" r="40" />,
  // A tall jar
  <path key="tall" d="M30 96V40a20 20 0 0 1 40 0v56z" />,
  // A box
  <rect key="box" x="12" y="30" width="76" height="66" rx="8" />,
];

function shapeOf(slug: string) {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return keepsakeShapes[hash % keepsakeShapes.length];
}

/**
 * A game's keepsake: its slot's art, or a placeholder tinted `tint`, the
 * colour of the class the student played it in.
 */
export function KeepsakePicture({
  slug,
  tint,
}: {
  slug: string;
  tint: string;
}) {
  const art = keepsakeArt[slug];
  return (
    <svg
      data-slot="keepsake"
      data-game={slug}
      data-placeholder={art ? undefined : true}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {art ? (
        art.draw()
      ) : (
        <g fill={tint} stroke="#FFFFFF" strokeWidth="5">
          {shapeOf(slug)}
        </g>
      )}
    </svg>
  );
}
