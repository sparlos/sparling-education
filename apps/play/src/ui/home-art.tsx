// Each game's picture on its card on home, by named slot (`home-card`),
// like other game art: real art registered under the same slot replaces the
// placeholder without code changes. It lives in the shell, not the game, so
// home never downloads a game's code. A game without its own is a
// tinted placeholder in its class's colour.
import { palette } from "@repo/tokens";
import type { ReactNode } from "react";

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

/** The picture on a game's card on home: its slot's art, or the placeholder. */
export function HomeCardPicture({ slug }: { slug: string }) {
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
