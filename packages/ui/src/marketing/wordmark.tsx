import { brandByline, brandName, color } from "@repo/tokens";
import {
  logoLayout,
  markBox,
  markGoldRun,
  markParts,
  markSpine,
  type Placed,
} from "@repo/tokens/mark";
import { bylineOutline, nameOutline } from "@repo/tokens/wordmark";
import { useId } from "react";
import classes from "./wordmark.module.css";

interface WordmarkProps {
  /** Wraps the wordmark in a link, usually to the home page. */
  href?: string;
  size?: "md" | "lg";
  /** For dark backgrounds. */
  inverse?: boolean;
  /** Adds "by Sparling Education" under the name. Only where it's readable. */
  byline?: boolean;
}

const words = { name: nameOutline, byline: bylineOutline };
const at = (p: Placed) => `translate(${p.x} ${p.y}) scale(${p.scale})`;

/** The logo: the mark beside the product name, drawn as one picture. */
export function Wordmark({
  href,
  size = "md",
  inverse,
  byline,
}: WordmarkProps) {
  const layout = logoLayout(words, "horizontal", Boolean(byline));
  const picture = (
    <svg
      className={classes.logo}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role={href ? undefined : "img"}
      aria-label={
        href ? undefined : byline ? `${brandName} ${brandByline}` : brandName
      }
      aria-hidden={href ? "true" : undefined}
    >
      <g transform={at(layout.mark)}>
        <MarkShapes inverse={inverse} />
      </g>
      <path
        transform={at(layout.name)}
        d={nameOutline.d}
        fill={inverse ? "var(--k-ink-inverse)" : "var(--k-ink)"}
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
  const shared = {
    className: classes.root,
    "data-size": size,
    "data-byline": byline || undefined,
  };
  return href ? (
    <a href={href} aria-label={`${brandName} home`} {...shared}>
      {picture}
    </a>
  ) : (
    <span {...shared}>{picture}</span>
  );
}

/** The mark on its own: gold wings over an open book. */
export function Mark({ mono, inverse }: { mono?: boolean; inverse?: boolean }) {
  return (
    <svg
      className={classes.mark}
      viewBox={`0 0 ${markBox.width} ${markBox.height}`}
      aria-hidden="true"
    >
      <MarkShapes mono={mono} inverse={inverse} />
    </svg>
  );
}

/** The mark's shapes, in mark units, for placing inside another SVG. */
function MarkShapes({ mono, inverse }: { mono?: boolean; inverse?: boolean }) {
  const id = useId();
  const gold = mono ? "currentColor" : `url(#${id}-gold)`;
  const book = mono
    ? "currentColor"
    : inverse
      ? color.logo.bookOnDark
      : color.logo.book;
  return (
    <>
      <defs>
        {!mono && (
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
        )}
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
          fill={part.colour === "gold" ? gold : book}
          clipPath={part.side ? `url(#${id}-${part.side})` : undefined}
        />
      ))}
    </>
  );
}
